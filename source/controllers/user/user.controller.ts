import { Response } from "express";
import axios from "axios";
import { Types, startSession } from "mongoose";
import bcryptjs from "bcryptjs";
import UserRepository from "../../repositories/user.repository";
import walletRepository from "../../repositories/wallet.repository";
import { ExpressRequest } from "../../server";
import {
    APP_CONSTANTS,
    USER_REGISTRATION_DISCORD_CHANNEL_DEVELOPMENT,
    USER_REGISTRATION_DISCORD_CHANNEL_PRODUCTION,
    WALLET_GENERATION_DISCORD_CHANNEL_DEVELOPMENT,
    WALLET_GENERATION_DISCORD_CHANNEL_PRODUCTION,
} from "../../constants/app_defaults.constant";
import UtilFunctions, { link, throwIfUndefined } from "../../util";
import ResponseHandler from "../../util/response-handler";
import { WALLET_CURRENCIES } from "../../interfaces/wallet.interface";
import otpRepository from "../../repositories/otp.repository";
import userRepository from "../../repositories/user.repository";
import { WALLET_CONSTANT } from "../../constants/wallet.constant";
import {
    DiscordTaskJob,
    NotificationTaskJob,
} from "../../services/queues/producer.service";
import auditRepository from "../../repositories/audit.repository";
import {
    IAuditActivityStatus,
    IAuditActivityType,
} from "../../interfaces/audit.interface";
import { HTTP_CODES } from "../../constants/app_defaults.constant";
import { INotificationCategory } from "../../interfaces/notification.interface";
import { GOOGLE_SECRET_KEY, env } from "../../config";
import OAuth2ClientService from "../../helpers/auth.helper";

/***
 *
 *
 * Register User
 */
export async function Register(
    req: ExpressRequest,
    res: Response
): Promise<Response | void> {
    const session = await startSession(); //Start a session to perform DB operations in transaction
    session.startTransaction(); //Start the transaction on the DB
    const {
        first_name,
        last_name,
        middle_name,
        email,
        password,
        confirm_password,
        phone_number,
        is_diaspora,
        where_how,
        referral_code,
        token,
        ip_address,
    }: {
        first_name: string;
        middle_name: string;
        last_name: string;
        email: string;
        phone_number: string;
        password: string;
        confirm_password: string;
        is_diaspora?: boolean;
        where_how: string;
        referral_code: string;
        token: string;
        ip_address: string;
    } = req.body;

    try {
        const session = await startSession(); //Start a session to perform DB operations in transaction
        session.startTransaction(); //Start the transaction on the DB

        const ip =
            req.headers["x-real-ip"] ||
            req.headers["x-forwarded-for"] ||
            req.connection.remoteAddress;

        // Sending secret key and response token to Google Recaptcha API for authentication.
        const response = await axios.post(
            `https://www.google.com/recaptcha/api/siteverify?secret=${GOOGLE_SECRET_KEY}&response=${token}`
        );

        // Check response status and send back to the client-side
        if (response.data.success) {
            // try to get an existing user by their email address
            const existingUser = await UserRepository.getByEmail({
                email: email.toLowerCase(),
            });

            if (existingUser && existingUser.is_deleted) {
                return ResponseHandler.sendErrorResponse({
                    res,
                    code: HTTP_CODES.NOT_FOUND,
                    error: `This email address belongs to a deleted account. Please contact support for assistance.`,
                });
            }

            // if a matching user exists, return a conflict response
            if (existingUser) {
                return ResponseHandler.sendErrorResponse({
                    res,
                    code: HTTP_CODES.CONFLICT,
                    error: `This email is already taken`,
                });
            }

            // check if the passwords match
            if (password !== confirm_password) {
                return ResponseHandler.sendErrorResponse({
                    res,
                    code: HTTP_CODES.BAD_REQUEST,
                    error: "Your passwords do not match",
                });
            }

            // try to get a user with valid referral code
            const getReferralUser = await UserRepository.getByReferralCode({
                referral_code,
            });

            // if a valid referral code isn't provided, send an error response
            if (!getReferralUser && referral_code) {
                return ResponseHandler.sendErrorResponse({
                    res,
                    code: HTTP_CODES.BAD_REQUEST,
                    error: `Seems like you typed the wrong referral code.`,
                });
            }

            // generate a referral code for the new user
            const user_ref_code = UtilFunctions.generateReferralCode();
            // generate a wallet account number for the user
            const wallet_account_number =
                await UtilFunctions.generateWalletAccountNumber();

            // create the user in the database
            const user = await UserRepository.create({
                first_name,
                middle_name,
                last_name,
                email,
                password,
                confirm_password,
                phone_number,
                is_diaspora,
                where_how,
                referred_by: getReferralUser ? getReferralUser._id : null,
                user_ref_code: user_ref_code,
                ip_address: String(ip),
            });

            // if the user was referred, update the referrer's count
            if (getReferralUser) {
                await UserRepository.updateByReferralCode({ referral_code });
            }

            // Create a mongoose object reference
            const user_id = new Types.ObjectId(String(user._id));

            // create user's wallet
            const walletPayload = {
                user_id: user_id,
                user: {
                    first_name: first_name ? first_name.trim() : "",
                    email: email ? email.trim() : "",
                    last_name: last_name ? last_name.trim() : "",
                },
                wallet_account_number: wallet_account_number,
                total_credit_transactions: Number(
                    WALLET_CONSTANT.WALLET_REGISTRATION_AMOUNT
                ),
                currency: WALLET_CURRENCIES.USD,
                balance: 0,
            };
            const wallet = await walletRepository.create(walletPayload);

            const result = await Promise.all([
                // create a refer wallet for the user
                await walletRepository.createReferWallet({
                    user_id: user_id,
                    user: {
                        first_name: first_name ? first_name.trim() : "",
                        email: email ? email.trim() : "",
                        last_name: last_name ? last_name.trim() : "",
                    },
                    balance: 0,
                    session: session,
                }),
            ]);

            const failedTxns = result.filter((r) => r.success !== true);

            const error = failedTxns.map((r) => r.message);

            if (error.length > 0) {
                await session.abortTransaction();
                session.endSession();
                return ResponseHandler.sendErrorResponse({
                    res,
                    code: HTTP_CODES.BAD_REQUEST,
                    error: error[0],
                });
            }

            // if the wallet was created, send a discord notification
            if (wallet) {
                const walletDiscordMessage = `
        Wallet ID:- ${wallet?.wallet_account_number!},
        First Name:- ${user?.first_name!},
        Last Name:- ${user?.last_name!},
        Email:- ${email}
        Message:- Wallet generated and funded with ${
            WALLET_CONSTANT.WALLET_REGISTRATION_AMOUNT
        } dollar(s)
      `;
                await DiscordTaskJob({
                    name: "Wallet Generation",
                    data: {
                        title: `Wallet Generated | ${process.env.NODE_ENV} environment `,
                        message: walletDiscordMessage,
                        channel_link: env.isDev
                            ? WALLET_GENERATION_DISCORD_CHANNEL_DEVELOPMENT
                            : WALLET_GENERATION_DISCORD_CHANNEL_PRODUCTION,
                    },
                });

                // generate a one-time-password for email verification
                const otp = await UtilFunctions.generateOtp({ user_id });

                // create an instance of current date/time
                let createdAt = new Date();

                // send a verification email to the user
                await UtilFunctions.sendEmail2("verify.hbs", {
                    to: email,
                    subject: "Keble account verification OTP",
                    props: {
                        email,
                        otp: otp?.otp,
                        name: first_name,
                        createdAt,
                    },
                });

                // send a welcome email to the user
                await UtilFunctions.sendEmail2("welcome.hbs", {
                    to: email,
                    subject: "Welcome to Keble",
                    props: {
                        name: first_name,
                    },
                });

                // send user registration notification to discord
                const discordMessage = `
        First Name:- ${user?.first_name!},
        Last Name:- ${user?.last_name!},
        Email:- ${email}
      `;
                await DiscordTaskJob({
                    name: "Registration",
                    data: {
                        title: `New user registration | ${process.env.NODE_ENV} environment `,
                        message: discordMessage,
                        channel_link: env.isDev
                            ? USER_REGISTRATION_DISCORD_CHANNEL_DEVELOPMENT
                            : USER_REGISTRATION_DISCORD_CHANNEL_PRODUCTION,
                    },
                });

                await session.commitTransaction();
                session.endSession();

                // return success response after successful user creation
                return ResponseHandler.sendSuccessResponse({
                    message: `Verification email sent! Please check your inbox`,
                    code: HTTP_CODES.CREATED,
                    res,
                });
            }
        } else {
            return ResponseHandler.sendErrorResponse({
                res,
                code: HTTP_CODES.BAD_REQUEST,
                error: "You are not human",
            });
        }
    } catch (error) {
        await session.abortTransaction();
        session.endSession();
        return ResponseHandler.sendErrorResponse({
            res,
            code: HTTP_CODES.INTERNAL_SERVER_ERROR,
            error: `${error}`,
        });
    }
}

/***
 *
 *
 * Register User Mobile (Without Captcha)
 */
export async function RegisterMobile(
    req: ExpressRequest,
    res: Response
): Promise<Response | void> {
    const {
        first_name,
        last_name,
        middle_name,
        email,
        phone_number,
        password,
        confirm_password,
        is_diaspora,
        where_how,
        referral_code,
        ip_address,
    }: {
        first_name: string;
        middle_name: string;
        last_name: string;
        email: string;
        phone_number: string;
        password: string;
        confirm_password: string;
        is_diaspora?: boolean;
        where_how: string;
        referral_code: string;
        ip_address: string;
    } = req.body;

    try {
        const session = await startSession(); //Start a session to perform DB operations in transaction
        session.startTransaction(); //Start the transaction on the DB

        const ip =
            req.headers["x-real-ip"] ||
            req.headers["x-forwarded-for"] ||
            req.connection.remoteAddress;

        // try to get an existing user by their email address
        const existingUser = await UserRepository.getByEmail({
            email: email.toLowerCase(),
        });

        if (existingUser && existingUser.is_deleted) {
            return ResponseHandler.sendErrorResponse({
                res,
                code: HTTP_CODES.NOT_FOUND,
                error: `This email address belongs to a deleted account. Please contact support for assistance.`,
            });
        }

        // if a matching user exists, return a conflict response
        if (existingUser) {
            return ResponseHandler.sendErrorResponse({
                res,
                code: HTTP_CODES.CONFLICT,
                error: `This email is already taken`,
            });
        }

        // check if the passwords match
        if (password !== confirm_password) {
            return ResponseHandler.sendErrorResponse({
                res,
                code: HTTP_CODES.BAD_REQUEST,
                error: "Your passwords do not match",
            });
        }

        // try to get a user with valid referral code
        const getReferralUser = await UserRepository.getByReferralCode({
            referral_code,
        });

        // if a valid referral code isn't provided, send an error response
        if (!getReferralUser && referral_code) {
            return ResponseHandler.sendErrorResponse({
                res,
                code: HTTP_CODES.BAD_REQUEST,
                error: `Seems like you typed the wrong referral code.`,
            });
        }

        // generate a referral code for the new user
        const user_ref_code = UtilFunctions.generateReferralCode();
        // generate a wallet account number for the user
        const wallet_account_number =
            await UtilFunctions.generateWalletAccountNumber();

        // create the user in the database
        const user = await UserRepository.create({
            first_name,
            middle_name,
            last_name,
            email,
            phone_number,
            password,
            confirm_password,
            is_diaspora,
            where_how,
            referred_by: getReferralUser ? getReferralUser._id : null,
            user_ref_code: user_ref_code,
            ip_address: String(ip),
        });

        // if the user was referred, update the referrer's count
        if (getReferralUser) {
            await UserRepository.updateByReferralCode({ referral_code });
        }

        // Create a mongoose object reference
        const user_id = new Types.ObjectId(String(user._id));

        // create user's wallet
        const walletPayload = {
            user_id: user_id,
            user: {
                first_name: first_name ? first_name.trim() : "",
                email: email ? email.trim() : "",
                last_name: last_name ? last_name.trim() : "",
            },
            wallet_account_number: wallet_account_number,
            total_credit_transactions: Number(
                WALLET_CONSTANT.WALLET_REGISTRATION_AMOUNT
            ),
            currency: WALLET_CURRENCIES.USD,
            balance: 0,
        };
        const wallet = await walletRepository.create(walletPayload);

        const result = await Promise.all([
            // create a refer wallet for the user
            await walletRepository.createReferWallet({
                user_id: user_id,
                user: {
                    first_name: first_name ? first_name.trim() : "",
                    email: email ? email.trim() : "",
                    last_name: last_name ? last_name.trim() : "",
                },
                balance: 0,
                session: session,
            }),
        ]);

        const failedTxns = result.filter((r) => r.success !== true);

        const error = failedTxns.map((r) => r.message);

        if (error.length > 0) {
            await session.abortTransaction();
            session.endSession();
            return ResponseHandler.sendErrorResponse({
                res,
                code: HTTP_CODES.BAD_REQUEST,
                error: error[0],
            });
        }

        // if the wallet was created, send a discord notification
        if (wallet) {
            const walletDiscordMessage = `
        Wallet ID:- ${wallet?.wallet_account_number!},
        First Name:- ${user?.first_name!},
        Last Name:- ${user?.last_name!},
        Email:- ${email}
        Message:- Wallet generated and funded with ${
            WALLET_CONSTANT.WALLET_REGISTRATION_AMOUNT
        } dollar(s)
      `;
            await DiscordTaskJob({
                name: "Wallet Generation",
                data: {
                    title: `Wallet Generated | ${process.env.NODE_ENV} environment `,
                    message: walletDiscordMessage,
                    channel_link: env.isDev
                        ? WALLET_GENERATION_DISCORD_CHANNEL_DEVELOPMENT
                        : WALLET_GENERATION_DISCORD_CHANNEL_PRODUCTION,
                },
            });

            // generate a one-time-password for email verification
            const otp = await UtilFunctions.generateOtp({ user_id });

            // create an instance of current date/time
            let createdAt = new Date();

            // send a verification email to the user
            await UtilFunctions.sendEmail2("verify.hbs", {
                to: email,
                subject: "Keble account verification OTP",
                props: {
                    email,
                    otp: otp?.otp,
                    name: first_name,
                    createdAt,
                },
            });

            // send a welcome email to the user
            await UtilFunctions.sendEmail2("welcome.hbs", {
                to: email,
                subject: "Welcome to Keble",
                props: {
                    name: first_name,
                },
            });

            // send user registration notification to discord
            const discordMessage = `
        First Name:- ${user?.first_name!},
        Last Name:- ${user?.last_name!},
        Email:- ${email}
      `;
            await DiscordTaskJob({
                name: "Registration",
                data: {
                    title: `New user registration | ${process.env.NODE_ENV} environment `,
                    message: discordMessage,
                    channel_link: env.isDev
                        ? USER_REGISTRATION_DISCORD_CHANNEL_DEVELOPMENT
                        : USER_REGISTRATION_DISCORD_CHANNEL_PRODUCTION,
                },
            });

            await session.commitTransaction();
            session.endSession();

            // return success response after successful user creation
            return ResponseHandler.sendSuccessResponse({
                message: `Verification email sent! Please check your inbox`,
                code: HTTP_CODES.CREATED,
                res,
            });
        }
    } catch (error) {
        return ResponseHandler.sendErrorResponse({
            res,
            code: HTTP_CODES.INTERNAL_SERVER_ERROR,
            error: `${error}`,
        });
    }
}

/******
 *
 *
 * Verify Email
 */

export async function VerifyEmail(
    req: ExpressRequest,
    res: Response
): Promise<Response | void> {
    const { email, otp } = req.body;
    try {
        const user = await UserRepository.getByEmail({
            email: email.toLowerCase(),
        });

        if (!user) {
            return ResponseHandler.sendErrorResponse({
                res,
                code: HTTP_CODES.NOT_FOUND,
                error: "This email address is not registered on Keble.",
            });
        }

        if (user.verified_email) {
            return ResponseHandler.sendErrorResponse({
                res,
                code: HTTP_CODES.CONFLICT,
                error: "Your email address has already been verified",
            });
        }

        if (user.is_disabled) {
            return ResponseHandler.sendErrorResponse({
                res,
                code: HTTP_CODES.FORBIDDEN,
                error: "This account has been disabled",
            });
        }

        const verifyOtp = await otpRepository.verifyOtp({
            otp,
            user_id: user._id,
        });

        if (!verifyOtp.status) {
            return ResponseHandler.sendErrorResponse({
                res,
                code: HTTP_CODES.BAD_REQUEST,
                error: verifyOtp.message,
            });
        }

        const token = await UtilFunctions.generateToken({
            _id: user._id,
            first_name: user.first_name,
            last_name: user.last_name,
            email: user.email,
        });

        await UserRepository.atomicUpdate(user._id, {
            $set: {
                first_login: true,
                last_login: new Date(),
                verified_email: true,
                verified_email_at: new Date(),
            },
        });

        delete user.password;
        delete user.referral_invested_count;
        delete user.referral_count;
        delete user.has_invest;
        delete user?.last_login;

        const data = {
            token,
            ...user,
        };

        // Notification for to complete kyc
        await NotificationTaskJob({
            name: "User Notification",
            data: {
                user_id: user._id,
                title: "KYC request request",
                notification_category: INotificationCategory.ACCESS,
                content: `Complete your KYC to avoid account restrictions`,
                action_link: `${link()}/account`,
            },
        });

        return ResponseHandler.sendSuccessResponse({
            res,
            code: HTTP_CODES.CREATED,
            message: "Your email verification is successful!",
            data,
        });
    } catch (error) {
        return ResponseHandler.sendErrorResponse({
            res,
            code: HTTP_CODES.INTERNAL_SERVER_ERROR,
            error: `${error}`,
        });
    }
}

/***
 *
 *
 * Resend Verification
 */
export async function resendVerification(
    req: ExpressRequest,
    res: Response
): Promise<Response | void> {
    const {
        email,
    }: {
        email: string;
    } = req.body;

    try {
        const user = await UserRepository.getByEmail({
            email: email.toLowerCase(),
        });
        if (!user) {
            return ResponseHandler.sendErrorResponse({
                res,
                code: HTTP_CODES.NOT_FOUND,
                error: `User does not exist`,
            });
        }

        if (user.verified_email) {
            return ResponseHandler.sendErrorResponse({
                res,
                code: HTTP_CODES.CONFLICT,
                error: "Your email address has already been verified",
            });
        }

        if (user.is_disabled) {
            return ResponseHandler.sendErrorResponse({
                res,
                code: HTTP_CODES.FORBIDDEN,
                error: "This account has been disabled",
            });
        }

        // Save OTP
        const otp = await UtilFunctions.generateOtp({ user_id: user._id });

        let createdAt = new Date();

        await UtilFunctions.sendEmail2("verify.hbs", {
            to: email,
            subject: "Keble account verification OTP",
            props: {
                email,
                otp: otp?.otp,
                name: user.first_name,
                createdAt,
            },
        });

        return ResponseHandler.sendSuccessResponse({
            message: `Verification email sent! Please check your inbox`,
            code: HTTP_CODES.CREATED,
            res,
        });
    } catch (error) {
        return ResponseHandler.sendErrorResponse({
            res,
            code: HTTP_CODES.INTERNAL_SERVER_ERROR,
            error: `${error}`,
        });
    }
}

/****
 *
 *
 * Login
 */

// Login function to authenticate user
export async function Login(
    req: ExpressRequest,
    res: Response
): Promise<Response | void> {
    try {
        const { email, password } = req.body;

        // Get user by email
        const user = await UserRepository.getByEmail({
            email: email.toLowerCase().trim(),
        });

        if (!user) {
            // Return error response if user does not exist
            return ResponseHandler.sendErrorResponse({
                res,
                code: HTTP_CODES.NOT_FOUND,
                error: "This email address is not registered on Keble.",
            });
        }

        if (user && user.is_deleted) {
            return ResponseHandler.sendErrorResponse({
                res,
                code: HTTP_CODES.NOT_FOUND,
                error: `This email address belongs to a deleted account. Please contact support for assistance.`,
            });
        }

        // Check if user's email is verified
        if (!user.verified_email) {
            return res.status(401).json({
                success: false,
                code: HTTP_CODES.UNAUTHORIZED,
                message: "Email is not verified yet",
                data: {
                    verified_email: false,
                },
            });
        }

        // Check if user account is disabled
        if (user.is_disabled) {
            return ResponseHandler.sendErrorResponse({
                res,
                code: HTTP_CODES.FORBIDDEN,
                error: "Account blocked, Contact admin: hello@keble.co",
            });
        }

        // const ip =
        //   req.headers['x-real-ip'] || req.headers['x-forwarded-for'] || req.connection.remoteAddress;

        // Compare the passwords
        const result = bcryptjs.compareSync(password, user?.password!);
        if (!result) {
            return ResponseHandler.sendErrorResponse({
                res,
                code: HTTP_CODES.BAD_REQUEST,
                error: "Invalid Password! Please input the correct one.",
            });
        }

        // if (user.devices && user.devices.length > 0) {
        //   const check_device = user.devices.find((device: string) => device === ip);

        //   if (!check_device) {
        //     return res.status(HTTP_CODES.UNAUTHORIZED).json({
        //       success: false,
        //       code: HTTP_CODES.UNAUTHORIZED,
        //       message: 'This device is not registered to this account',
        //       data: {
        //         verified_device: false,
        //       },
        //     });
        //   }
        // }

        // Generate token
        const token = await UtilFunctions.generateToken({
            _id: user._id,
            first_name: user.first_name,
            last_name: user.last_name,
            email: user.email,
        });

        // Set first_login to false
        if (user.first_login) {
            await UserRepository.atomicUpdate(user._id, {
                $set: { first_login: false },
            });
        }

        // Delete unnecessary fields from user object
        delete user.password;
        delete user.pin;
        delete user.secret_password;
        delete user.secret_password_hint;
        delete user.pin_set_at;
        delete user.secret_password_set_at;
        delete user.referral_invested_count;
        delete user.referral_count;
        delete user.has_invest;
        delete user?.last_login;
        delete user?.total_amount_invested;
        delete user?.total_amount_withdrawn;
        delete user?.total_amount_funded;
        user?.card ? delete user?.card : null;

        const data = {
            token,
            ...user,
        };

        // Update last_login field in user document
        await UserRepository.atomicUpdate(user._id, {
            $set: { last_login: new Date() },
            $inc: { login_count: 1 },
            // $addToSet: { devices: ip },
        });

        // Create audit log
        await auditRepository.create({
            req,
            title: "User Login",
            name: `${user.first_name} ${user.last_name}`,
            activity_type: IAuditActivityType.ACCESS,
            activity_status: IAuditActivityStatus.SUCCESS,
            user: user._id,
        });

        return ResponseHandler.sendSuccessResponse({
            res,
            code: HTTP_CODES.OK,
            message: `Welcome back ${user.first_name}!`,
            data,
        });
    } catch (error) {
        // Return error response if any error occurs
        return ResponseHandler.sendErrorResponse({
            res,
            code: HTTP_CODES.INTERNAL_SERVER_ERROR,
            error: `${error}`,
        });
    }
}

/****
 *
 *
 * Login Mobile
 */

// Login function to authenticate user
export async function LoginMobile(
    req: ExpressRequest,
    res: Response
): Promise<Response | void> {
    try {
        const { email, password } = req.body;

        // Get user by email
        const user = await UserRepository.getByEmail({
            email: email.toLowerCase().trim(),
        });

        if (!user) {
            // Return error response if user does not exist
            return ResponseHandler.sendErrorResponse({
                res,
                code: HTTP_CODES.NOT_FOUND,
                error: "This email address is not registered on Keble.",
            });
        }

        if (user && user.is_deleted) {
            return ResponseHandler.sendErrorResponse({
                res,
                code: HTTP_CODES.NOT_FOUND,
                error: `This email address belongs to a deleted account. Please contact support for assistance.`,
            });
        }

        // Check if user's email is verified
        if (!user.verified_email) {
            return res.status(200).json({
                success: false,
                code: HTTP_CODES.OK,
                message: "Email is not verified yet",
                data: {
                    verified_email: false,
                },
            });
        }

        // Check if user account is disabled
        if (user.is_disabled) {
            return ResponseHandler.sendErrorResponse({
                res,
                code: HTTP_CODES.FORBIDDEN,
                error: "Account blocked, Contact admin: hello@keble.co",
            });
        }

        // const ip =
        //   req.headers['x-real-ip'] || req.headers['x-forwarded-for'] || req.connection.remoteAddress;

        // Compare the passwords
        const result = bcryptjs.compareSync(password, user?.password!);
        if (!result) {
            return ResponseHandler.sendErrorResponse({
                res,
                code: HTTP_CODES.BAD_REQUEST,
                error: "Invalid Password! Please input the correct one.",
            });
        }

        // if (user.devices && user.devices.length > 0) {
        //   const check_device = user.devices.find((device: string) => device === ip);

        //   if (!check_device) {
        //     return res.status(HTTP_CODES.UNAUTHORIZED).json({
        //       success: false,
        //       code: HTTP_CODES.UNAUTHORIZED,
        //       message: 'This device is not registered to this account',
        //       data: {
        //         verified_device: false,
        //       },
        //     });
        //   }
        // }

        // Generate token
        const token = await UtilFunctions.generateToken({
            _id: user._id,
            first_name: user.first_name,
            last_name: user.last_name,
            email: user.email,
        });

        // Set first_login to false
        if (user.first_login) {
            await UserRepository.atomicUpdate(user._id, {
                $set: { first_login: false },
            });
        }

        const data = {
            token,
            ...user,
            notification_count: user.notification_count || 0,
        };

        // Update last_login field in user document
        await UserRepository.atomicUpdate(user._id, {
            $set: { last_login: new Date() },
            $inc: { login_count: 1 },
            // $addToSet: { devices: ip },
        });

        // Create audit log
        await auditRepository.create({
            req,
            title: "User Login",
            name: `${user.first_name} ${user.last_name}`,
            activity_type: IAuditActivityType.ACCESS,
            activity_status: IAuditActivityStatus.SUCCESS,
            user: user._id,
        });

        return ResponseHandler.sendSuccessResponse({
            res,
            code: HTTP_CODES.OK,
            message: `Welcome back ${user.first_name}!`,
            data,
        });
    } catch (error) {
        // Return error response if any error occurs
        return ResponseHandler.sendErrorResponse({
            res,
            code: HTTP_CODES.INTERNAL_SERVER_ERROR,
            error: `${error}`,
        });
    }
}

/****
 *
 *
 * Secret Password Login
 */

// Login function to authenticate user
export async function secretPasswordAuthenticate(
    req: ExpressRequest,
    res: Response
): Promise<Response | void> {
    try {
        const { email, secret_password, ip_address } = req.body;
        // Get user by email
        const user = await UserRepository.getByEmail({
            email: email.toLowerCase(),
        });

        const ip =
            req.headers["x-real-ip"] ||
            req.headers["x-forwarded-for"] ||
            req.connection.remoteAddress;

        if (!user) {
            // Return error response if user does not exist
            return ResponseHandler.sendErrorResponse({
                res,
                code: HTTP_CODES.NOT_FOUND,
                error: "This email address is not registered on Keble.",
            });
        }

        if (user && user.is_deleted) {
            return ResponseHandler.sendErrorResponse({
                res,
                code: HTTP_CODES.NOT_FOUND,
                error: `This email address belongs to a deleted account. Please contact support for assistance.`,
            });
        }

        // Check if user's email is verified
        if (!user.verified_email) {
            return res.status(401).json({
                success: false,
                code: HTTP_CODES.UNAUTHORIZED,
                message: "Email is not verified yet",
                data: {
                    verified_email: false,
                },
            });
        }

        // Check if user account is disabled
        if (user.is_disabled) {
            return ResponseHandler.sendErrorResponse({
                res,
                code: HTTP_CODES.FORBIDDEN,
                error: "Account blocked, Contact admin: hello@keble.co",
            });
        }

        // Compare the secret passwords
        const result = bcryptjs.compareSync(
            secret_password.toLowerCase(),
            user?.secret_password!
        );
        if (!result) {
            return res.status(HTTP_CODES.BAD_REQUEST).json({
                success: false,
                code: HTTP_CODES.BAD_REQUEST,
                message:
                    "Invalid Secret Password! Please input the correct one.",
                hint: user?.secret_password_hint,
            });
        }

        // Generate token
        const token = await UtilFunctions.generateToken({
            _id: user._id,
            first_name: user.first_name,
            last_name: user.last_name,
            email: user.email,
        });

        // Set first_login to false
        if (user.first_login) {
            await UserRepository.atomicUpdate(user._id, {
                $set: { first_login: false },
            });
        }

        // Delete unnecessary fields from user object
        delete user.password;
        delete user.pin;
        delete user.secret_password;
        delete user.secret_password_hint;
        delete user.pin_set_at;
        delete user.secret_password_set_at;
        delete user.referral_invested_count;
        delete user.referral_count;
        delete user.has_invest;
        delete user?.last_login;
        delete user?.total_amount_invested;
        delete user?.total_amount_withdrawn;
        delete user?.total_amount_funded;
        user?.card ? delete user?.card : null;

        const data = {
            token,
            ...user,
        };

        // Update last_login field in user document
        await UserRepository.atomicUpdate(user._id, {
            $set: { last_login: new Date() },
            $inc: { login_count: 1 },
            $addToSet: { devices: String(ip) },
        });

        // Create audit log
        await auditRepository.create({
            req,
            title: "User Login",
            name: `${user.first_name} ${user.last_name}`,
            activity_type: IAuditActivityType.ACCESS,
            activity_status: IAuditActivityStatus.SUCCESS,
            user: user._id,
        });

        return ResponseHandler.sendSuccessResponse({
            res,
            code: HTTP_CODES.OK,
            message: `Welcome back ${user.first_name}!`,
            data,
        });
    } catch (error) {
        // Return error response if any error occurs
        return ResponseHandler.sendErrorResponse({
            res,
            code: HTTP_CODES.INTERNAL_SERVER_ERROR,
            error: `${error}`,
        });
    }
}

/****
 *
 *
 * PIN Login
 */

export async function pinLogin(
    req: ExpressRequest,
    res: Response
): Promise<Response | void> {
    const { email, pin } = req.body;

    try {
        const user = await UserRepository.getByEmail({
            email: email.toLowerCase(),
        });

        // const ip =
        //   req.headers['x-real-ip'] || req.headers['x-forwarded-for'] || req.connection.remoteAddress;

        if (!user) {
            return ResponseHandler.sendErrorResponse({
                res,
                code: HTTP_CODES.NOT_FOUND,
                error: "This email address is not registered on Keble.",
            });
        }

        if (user && user.is_deleted) {
            return ResponseHandler.sendErrorResponse({
                res,
                code: HTTP_CODES.NOT_FOUND,
                error: `This email address belongs to a deleted account. Please contact support for assistance.`,
            });
        }

        if (!user.verified_email) {
            return res.status(401).json({
                success: false,
                code: HTTP_CODES.UNAUTHORIZED,
                message: "This  email address has not been verified",
                data: {
                    verified_email: false,
                },
            });
        }

        if (user.is_disabled) {
            return ResponseHandler.sendErrorResponse({
                res,
                code: HTTP_CODES.FORBIDDEN,
                error: "Account blocked, Contact admin: hello@keble.co",
            });
        }

        if (user.toggle_user_pin && !user.is_two_fa) {
            return ResponseHandler.sendErrorResponse({
                res,
                code: HTTP_CODES.FORBIDDEN,
                error: "PIN login is enabled but no PIN was set",
            });
        }

        if (!user.is_two_fa) {
            return ResponseHandler.sendErrorResponse({
                res,
                code: HTTP_CODES.FORBIDDEN,
                error: "Two Factor Authentication is not enabled",
            });
        }

        const result = bcryptjs.compareSync(pin, user?.pin!);
        if (!result) {
            return ResponseHandler.sendErrorResponse({
                res,
                code: HTTP_CODES.BAD_REQUEST,
                error: "PIN is incorrect",
            });
        }

        // if (user.devices && user.devices.length > 0) {
        //   const check_device = user.devices.find((device: string) => device === ip);

        //   if (!check_device) {
        //     return res.status(HTTP_CODES.UNAUTHORIZED).json({
        //       success: false,
        //       code: HTTP_CODES.UNAUTHORIZED,
        //       message: 'This device is not registered to this account',
        //       data: {
        //         verified_device: false,
        //       },
        //     });
        //   }
        // }

        const token = await UtilFunctions.generateToken({
            _id: user._id,
            first_name: user.first_name,
            last_name: user.last_name,
            email: user.email,
        });

        if (user.first_login) {
            await UserRepository.atomicUpdate(user._id, {
                $set: { first_login: false },
            });
        }

        const data = {
            token,
            ...user,
            notification_count: user.notification_count || 0,
        };

        await UserRepository.atomicUpdate(user._id, {
            $set: {
                last_login: new Date(),
                // $addToSet: { devices: ip }
            },
        });

        // Audit
        await auditRepository.create({
            req,
            title: "User Login via PIN",
            name: `${user.first_name} ${user.last_name}`,
            activity_type: IAuditActivityType.ACCESS,
            activity_status: IAuditActivityStatus.SUCCESS,
            user: user._id,
        });

        return ResponseHandler.sendSuccessResponse({
            res,
            code: HTTP_CODES.OK,
            message: "PIN Login successful",
            data,
        });
    } catch (error) {
        return ResponseHandler.sendErrorResponse({
            res,
            code: HTTP_CODES.INTERNAL_SERVER_ERROR,
            error: `${error}`,
        });
    }
}

/****
 *
 *
 * Recover Email
 */

export async function recover(
    req: ExpressRequest,
    res: Response
): Promise<Response | void> {
    const { email } = req.body;

    try {
        const user = await UserRepository.getByEmail({
            email: email.toLowerCase(),
        });

        if (!user) {
            return ResponseHandler.sendErrorResponse({
                res,
                code: HTTP_CODES.NOT_FOUND,
                error: "This email address is not registered on Keble.",
            });
        }

        if (user && user.is_deleted) {
            return ResponseHandler.sendErrorResponse({
                res,
                code: HTTP_CODES.NOT_FOUND,
                error: `This email address belongs to a deleted account. Please contact support for assistance.`,
            });
        }

        if (!user.verified_email) {
            return ResponseHandler.sendErrorResponse({
                res,
                code: HTTP_CODES.UNAUTHORIZED,
                error: "This  email address has not been verified.",
            });
        }

        if (user.is_disabled) {
            return ResponseHandler.sendErrorResponse({
                res,
                code: HTTP_CODES.FORBIDDEN,
                error: "Account blocked, Contact admin: hello@keble.co",
            });
        }

        // Save OTP
        const otp = await UtilFunctions.generateOtp({ user_id: user._id });

        let createdAt = new Date();

        await UtilFunctions.sendEmail("recover.pug", {
            to: email,
            subject: "Keble Password Recovery",
            props: {
                email,
                otp: otp?.otp,
                name: user.first_name,
                createdAt,
            },
        });

        // Audit
        await auditRepository.create({
            req,
            title: "User Email Recovery",
            name: `${user.first_name} ${user.last_name}`,
            activity_type: IAuditActivityType.ACCESS,
            activity_status: IAuditActivityStatus.SUCCESS,
            user: user._id,
        });

        return ResponseHandler.sendSuccessResponse({
            res,
            code: HTTP_CODES.OK,
            message: "Check your inbox for your reset email.",
        });
    } catch (error) {
        return ResponseHandler.sendErrorResponse({
            res,
            code: HTTP_CODES.INTERNAL_SERVER_ERROR,
            error: `${error}`,
        });
    }
}

export async function resetPin(
    req: ExpressRequest,
    res: Response
): Promise<Response | void> {
    try {
        const { email, password, new_pin, confirm_pin } = req.body;

        const user = await UserRepository.getByEmail({
            email: email.toLowerCase(),
        });

        if (!user) {
            return ResponseHandler.sendErrorResponse({
                res,
                code: HTTP_CODES.NOT_FOUND,
                error: "This email address is not registered on Keble.",
            });
        }

        if (user && user.is_deleted) {
            return ResponseHandler.sendErrorResponse({
                res,
                code: HTTP_CODES.NOT_FOUND,
                error: `This email address belongs to a deleted account. Please contact support for assistance.`,
            });
        }

        if (!user.verified_email) {
            return ResponseHandler.sendErrorResponse({
                res,
                code: HTTP_CODES.UNAUTHORIZED,
                error: "This  email address has not been verified.",
            });
        }

        if (user.is_disabled) {
            return ResponseHandler.sendErrorResponse({
                res,
                code: HTTP_CODES.FORBIDDEN,
                error: "Account blocked, Contact admin: hello@keble.co",
            });
        }

        const result = bcryptjs.compareSync(password, user?.password!);

        if (!result) {
            return ResponseHandler.sendErrorResponse({
                res,
                code: HTTP_CODES.BAD_REQUEST,
                error: "Invalid Password! Please input the correct one.",
            });
        }

        if (new_pin !== confirm_pin) {
            return ResponseHandler.sendErrorResponse({
                res,
                code: HTTP_CODES.BAD_REQUEST,
                error: "PIN does not match",
            });
        }

        const hashedPin = bcryptjs.hashSync(new_pin, 10);

        await UserRepository.atomicUpdate(user._id, {
            $set: {
                pin: hashedPin,
                pin_set_at: new Date(),
            },
        });

        return ResponseHandler.sendSuccessResponse({
            res,
            code: HTTP_CODES.CREATED,
            message: "PIN reset successful",
        });
    } catch (error) {
        return ResponseHandler.sendErrorResponse({
            res,
            code: HTTP_CODES.INTERNAL_SERVER_ERROR,
            error: `${error}`,
        });
    }
}

/****
 *
 *
 * Recover PIN
 */

export async function recoverPin(
    req: ExpressRequest,
    res: Response
): Promise<Response | void> {
    const { email } = req.body;

    try {
        const user = await UserRepository.getByEmail({
            email: email.toLowerCase(),
        });

        if (!user) {
            return ResponseHandler.sendErrorResponse({
                res,
                code: HTTP_CODES.NOT_FOUND,
                error: "This email address is not registered on Keble.",
            });
        }

        if (user && user.is_deleted) {
            return ResponseHandler.sendErrorResponse({
                res,
                code: HTTP_CODES.NOT_FOUND,
                error: `This email address belongs to a deleted account. Please contact support for assistance.`,
            });
        }

        if (!user.verified_email) {
            return ResponseHandler.sendErrorResponse({
                res,
                code: HTTP_CODES.UNAUTHORIZED,
                error: "This  email address has not been verified.",
            });
        }

        if (user.is_disabled) {
            return ResponseHandler.sendErrorResponse({
                res,
                code: HTTP_CODES.FORBIDDEN,
                error: "Account blocked, Contact admin: hello@keble.co",
            });
        }

        // Save OTP
        const otp = await UtilFunctions.generateOtp({ user_id: user._id });

        let createdAt = new Date();

        await UtilFunctions.sendEmail("recover.pug", {
            to: email,
            subject: "Keble Password Recovery",
            props: {
                email,
                otp: otp?.otp,
                name: user.first_name,
                createdAt,
            },
        });

        // Audit
        await auditRepository.create({
            req,
            title: "User Email Recovery",
            name: `${user.first_name} ${user.last_name}`,
            activity_type: IAuditActivityType.ACCESS,
            activity_status: IAuditActivityStatus.SUCCESS,
            user: user._id,
        });

        return ResponseHandler.sendSuccessResponse({
            res,
            code: HTTP_CODES.OK,
            message: "Check your inbox for your reset email.",
        });
    } catch (error) {
        return ResponseHandler.sendErrorResponse({
            res,
            code: HTTP_CODES.INTERNAL_SERVER_ERROR,
            error: `${error}`,
        });
    }
}

/****
 *
 *
 * Verify OTP
 */

export async function verifyOtp(
    req: ExpressRequest,
    res: Response
): Promise<Response | void> {
    const { email, otp } = req.body;

    try {
        const user = await UserRepository.getByEmail({
            email: email.toLowerCase(),
        });

        if (!user) {
            return ResponseHandler.sendErrorResponse({
                res,
                code: HTTP_CODES.NOT_FOUND,
                error: "This email address is not registered on Keble.",
            });
        }

        if (user && user.is_deleted) {
            return ResponseHandler.sendErrorResponse({
                res,
                code: HTTP_CODES.NOT_FOUND,
                error: `This email address belongs to a deleted account. Please contact support for assistance.`,
            });
        }

        if (!user.verified_email) {
            return ResponseHandler.sendErrorResponse({
                res,
                code: HTTP_CODES.UNAUTHORIZED,
                error: "This email address has not been verified.",
            });
        }

        if (user.is_disabled) {
            return ResponseHandler.sendErrorResponse({
                res,
                code: HTTP_CODES.FORBIDDEN,
                error: "Account blocked, Contact admin: hello@keble.co",
            });
        }

        const verifyOtp = await otpRepository.verifyOtp({
            otp,
            user_id: user._id,
        });

        if (!verifyOtp.status) {
            return ResponseHandler.sendErrorResponse({
                res,
                code: HTTP_CODES.BAD_REQUEST,
                error: verifyOtp.message,
            });
        }

        const token = await UtilFunctions.generateToken({
            _id: user._id,
            first_name: user.first_name,
            last_name: user.last_name,
            email: user.email,
        });

        const data = {
            token,
        };

        // Audit
        await auditRepository.create({
            req,
            title: "Verify OTP",
            name: `${user.first_name} ${user.last_name}`,
            activity_type: IAuditActivityType.ACCESS,
            activity_status: IAuditActivityStatus.SUCCESS,
            user: user._id,
        });

        return ResponseHandler.sendSuccessResponse({
            res,
            code: HTTP_CODES.OK,
            message: "OTP Verification successful.",
            data,
        });
    } catch (error) {
        return ResponseHandler.sendErrorResponse({
            res,
            code: HTTP_CODES.INTERNAL_SERVER_ERROR,
            error: `${error}`,
        });
    }
}

/****
 *
 *
 * Reset Password
 */

export async function resetPassword(
    req: ExpressRequest,
    res: Response
): Promise<Response | void> {
    const { token, new_password, confirm_password } = req.body;

    try {
        const verify_token: any = await UtilFunctions.verifyToken(token);

        if (!verify_token.status) {
            return ResponseHandler.sendErrorResponse({
                res,
                code: HTTP_CODES.UNAUTHORIZED,
                error: verify_token.error,
            });
        }

        const user = await UserRepository.getByEmail({
            email: verify_token.decoded.email,
        });

        if (!user) {
            return ResponseHandler.sendErrorResponse({
                res,
                code: HTTP_CODES.NOT_FOUND,
                error: "This email address is not registered on Keble.",
            });
        }

        if (user && user.is_deleted) {
            return ResponseHandler.sendErrorResponse({
                res,
                code: HTTP_CODES.NOT_FOUND,
                error: `This email address belongs to a deleted account. Please contact support for assistance.`,
            });
        }

        if (!user.verified_email) {
            return ResponseHandler.sendErrorResponse({
                res,
                code: HTTP_CODES.UNAUTHORIZED,
                error: "This email address has not been verified",
            });
        }

        if (user.is_disabled) {
            return ResponseHandler.sendErrorResponse({
                res,
                code: HTTP_CODES.FORBIDDEN,
                error: "Account blocked, Contact admin: hello@keble.co",
            });
        }

        if (new_password !== confirm_password) {
            return ResponseHandler.sendErrorResponse({
                res,
                code: HTTP_CODES.BAD_REQUEST,
                error: `Your passwords do not match.`,
            });
        }

        const hash = bcryptjs.hashSync(
            new_password,
            APP_CONSTANTS.GENERAL.SALT_ROUNDS
        );

        await userRepository.atomicUpdate(user._id, {
            $set: { password: hash },
        });

        // Audit
        await auditRepository.create({
            req,
            title: "User Password Reset",
            name: `${user.first_name} ${user.last_name}`,
            activity_type: IAuditActivityType.ACCESS,
            activity_status: IAuditActivityStatus.SUCCESS,
            user: user._id,
        });

        return ResponseHandler.sendSuccessResponse({
            res,
            code: HTTP_CODES.OK,
            message: "Success! Your password has been changed.",
        });
    } catch (error) {
        return ResponseHandler.sendErrorResponse({
            res,
            code: HTTP_CODES.INTERNAL_SERVER_ERROR,
            error: `${error}`,
        });
    }
}

/*****
 *
 *
 * Get User Details
 */
export async function getUserDetails(
    req: ExpressRequest,
    res: Response
): Promise<Response | void> {
    try {
        const user = throwIfUndefined(req.user, "req.user");

        const getUser = await userRepository.getById({ _id: user._id });

        if (!getUser) {
            return ResponseHandler.sendErrorResponse({
                res,
                code: HTTP_CODES.NOT_FOUND,
                error: "User does not exist",
            });
        }

        delete getUser.password;
        delete getUser.referral_invested_count;
        delete getUser.referral_count;
        delete getUser.has_invest;
        delete getUser?.last_login;

        return ResponseHandler.sendSuccessResponse({
            res,
            code: HTTP_CODES.OK,
            message: "Success! Your details have been fetched.",
            data: getUser,
        });
    } catch (error) {
        return ResponseHandler.sendErrorResponse({
            res,
            code: HTTP_CODES.INTERNAL_SERVER_ERROR,
            error: `${error}`,
        });
    }
}

/**********************
 *
 * Create Secret Password
 *
 */

export async function setupSecretPassword(
    req: ExpressRequest,
    res: Response
): Promise<Response | void> {
    try {
        const user = throwIfUndefined(req.user, "req.user");

        const getUser = await userRepository.getById({ _id: user._id });

        if (!getUser) {
            return ResponseHandler.sendErrorResponse({
                res,
                code: HTTP_CODES.NOT_FOUND,
                error: "This email address is not registered on Keble.",
            });
        }

        const {
            secret_password,
            confirm_secret_password,
            secret_password_hint,
        } = req.body;

        if (secret_password !== confirm_secret_password) {
            return ResponseHandler.sendErrorResponse({
                res,
                code: HTTP_CODES.BAD_REQUEST,
                error: "Your secret password do not match.",
            });
        }

        const hash = bcryptjs.hashSync(
            secret_password.toLowerCase(),
            APP_CONSTANTS.GENERAL.SALT_ROUNDS
        );

        await userRepository.atomicUpdate(user._id, {
            $set: {
                secret_password: hash,
                secret_password_hint: secret_password_hint,
                secret_password_set_at: new Date(),
                is_secret_password_set: true,
            },
        });

        // Audit
        await auditRepository.create({
            req,
            title: "User Secret Password Setup",
            name: `${user.first_name} ${user.last_name}`,
            activity_type: IAuditActivityType.ACCESS,
            activity_status: IAuditActivityStatus.SUCCESS,
            user: user._id,
        });

        return ResponseHandler.sendSuccessResponse({
            res,
            code: HTTP_CODES.OK,
            message: "Secret password setup successful",
        });
    } catch (error) {
        return ResponseHandler.sendErrorResponse({
            res,
            code: HTTP_CODES.INTERNAL_SERVER_ERROR,
            error: `${error}`,
        });
    }
}


/****
 *
 *
 * Login Social
 */

export async function loginSocial(
    req: ExpressRequest,
    res: Response
): Promise<Response | void> {
    try {

        console.log("Starting social login")
        const { id_token } = req.body
        const user: any = await OAuth2ClientService.getTokenInfos(id_token, res)
        const token = await UtilFunctions.generateToken(user)

        const data = {
            token,
            ...user,
        };

        return ResponseHandler.sendSuccessResponse({
            res,
            code: HTTP_CODES.OK,
            message: `Welcome back ${user.user_name}!`,
            data,
        });
    } catch (error) {
        // Return error response if any error occurs
        return ResponseHandler.sendErrorResponse({
            res,
            code: HTTP_CODES.INTERNAL_SERVER_ERROR,
            error: `${error}`,
        });
    }
}