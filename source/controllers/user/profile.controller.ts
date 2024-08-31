import { Response } from "express";
import bcrypt from "bcrypt";
import { ExpressRequest } from "../../server";
import { UploadedFile } from "express-fileupload";
import bcryptjs from "bcryptjs";
import ImageService from "../../services/image.service";
import UtilFunctions, { throwIfUndefined } from "../../util";
import ResponseHandler from "../../util/response-handler";
import userRepository from "../../repositories/user.repository";
import {
    HTTP_CODES,
    KYC_DISCORD_CHANNEL_DEVELOPMENT,
    KYC_DISCORD_CHANNEL_PRODUCTION,
} from "../../constants/app_defaults.constant";
import { youVerifyApiClient } from "../../integrations/youVerifyApiClient";
import { IDType } from "../../interfaces/user.interface";
import planRepository from "../../repositories/portfolio.repository";
import { IPortfolioStatus } from "../../interfaces/plan.interface";
import walletRepository from "../../repositories/wallet.repository";
import otpRepository from "../../repositories/otp.repository";
import { env } from "../../config";
import { DiscordTaskJob } from "../../services/queues/producer.service";
import { discordMessageHelper } from "../../helpers/discord.helper";

/*****
 *
 *
 * Get User Profile
 */
export async function getUserProfile(
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
                error: "User not found. Please check your input.",
            });
        }

        const profile = await userRepository.getByQuery(
            { _id: user._id },
            "first_name middle_name last_name email phone_number dob user_ref_code gender country profile_photo nok_fullname nok_email nok_phone_number nok_relationship nok_location kyc_percent kyc_completed notification_count is_diaspora"
        );

        const data = {
            ...profile,
            notification_count: profile?.notification_count || 0,
        };

        return ResponseHandler.sendSuccessResponse({
            res,
            code: HTTP_CODES.OK,
            message: "Your profile has been successfully retrieved.",
            data: data,
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
 * Upload Profile Image
 */

export async function uploadProfileImage(
    req: ExpressRequest,
    res: Response
): Promise<Response | void> {
    try {
        const user = throwIfUndefined(req.user, "req.user");
        const getUser = await userRepository.getById({ _id: user._id });
        const user_profile_image = getUser?.profile_photo!;

        const { files } = req;

        if (files && files.profile_photo) {
            if (user_profile_image) {
                await ImageService.deleteImageFromS3(user_profile_image);
            }

            const profile_photo = files.profile_photo as UploadedFile;

            const validateFileResult = await UtilFunctions.validateUploadedFile(
                {
                    file: profile_photo,
                }
            );

            if (!validateFileResult.success) {
                return ResponseHandler.sendErrorResponse({
                    code: HTTP_CODES.BAD_REQUEST,
                    error: validateFileResult.error as string,
                    res,
                });
            }

            const upload_image = await ImageService.linkImageToUserProfile(
                profile_photo,
                user._id
            );

            return ResponseHandler.sendSuccessResponse({
                res,
                code: HTTP_CODES.CREATED,
                message: "Your profile image has been successfully uploaded.",
                data: upload_image?.profile_photo,
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

/****
 *
 *
 * Edit Profile
 */

export async function editProfile(
    req: ExpressRequest,
    res: Response
): Promise<Response | void> {
    try {
        const user_id = throwIfUndefined(req.user, "req.user")._id;

        Object.keys(req.body).forEach((e: string) => {
            if (
                req.body[e] === "" ||
                req.body[e] === "null" ||
                req.body[e] === "undefined" ||
                req.body[e] === "Invalid Date" ||
                req.body[e] === "invalid"
            ) {
                delete req.body[e];
            }
        });

        const user = await userRepository.atomicUpdate(user_id, req.body);

        if (user) {
            return ResponseHandler.sendSuccessResponse({
                res,
                code: HTTP_CODES.OK,
                message: "Your details have been successfully updated.",
                data: user,
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

/****
 *
 *
 * Next of kin
 */

export async function addNextOfKin(
    req: ExpressRequest,
    res: Response
): Promise<Response | void> {
    try {
        const user = throwIfUndefined(req.user, "req.user");
        const user_id = user._id;

        const {
            nok_fullname,
            nok_email,
            nok_phone_number,
            nok_relationship,
            nok_location,
        } = req.body;

        const nok = await userRepository.updateNextOfKin({
            user_id,
            nok_fullname,
            nok_email,
            nok_phone_number,
            nok_relationship,
            nok_location,
        });

        if (nok) {
            return ResponseHandler.sendSuccessResponse({
                res,
                code: HTTP_CODES.CREATED,
                message: "Your next of kin information has been saved.",
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

/****
 *
 *
 * Verify Identity
 */

export async function verifyIdentity(
    req: ExpressRequest,
    res: Response
): Promise<Response | void> {
    try {
        const user_id = throwIfUndefined(req.user, "req.user")._id;

        const user = await userRepository.getById({ _id: user_id });

        if (!user) {
            return ResponseHandler.sendErrorResponse({
                res,
                code: HTTP_CODES.NOT_FOUND,
                error: "User not found.",
            });
        }

        const { id_type, id_number, lastName } = req.body;

        if (!id_type) {
            return ResponseHandler.sendErrorResponse({
                res,
                code: HTTP_CODES.BAD_REQUEST,
                error: "Please provide ID Type",
            });
        }

        if (!id_number) {
            return ResponseHandler.sendErrorResponse({
                res,
                code: HTTP_CODES.BAD_REQUEST,
                error: "Please provide ID Number",
            });
        }

        if (id_type === IDType.INTERNATIONAL_PASSPORT && !lastName) {
            return ResponseHandler.sendErrorResponse({
                res,
                code: HTTP_CODES.BAD_REQUEST,
                error: "Please provide Last Name",
            });
        }

        let saved_id;

        const check = await userRepository.getByQuery({
            id_verification: id_type,
            id_number: id_number,
        });

        if (check) {
            await discordMessageHelper(
                req,
                user,
                "Sorry, this ID has already been used by another user. ❌",
                KYC_DISCORD_CHANNEL_DEVELOPMENT,
                KYC_DISCORD_CHANNEL_PRODUCTION,
                "Sorry, this ID has already been used by another user"
            );

            return ResponseHandler.sendErrorResponse({
                res,
                code: HTTP_CODES.BAD_REQUEST,
                error: `Sorry, this ID has already been used by another user.`,
            });
        }

        if (id_type === IDType.BVN) {
            const verify_bvn = await youVerifyApiClient.bvnVerification({
                id: id_number,
                isSubjectConsent: true,
            });

            if (!verify_bvn.success) {
                await discordMessageHelper(
                    req,
                    user,
                    `BVN => ${verify_bvn.message} | ${process.env.NODE_ENV} environment ❌`,
                    KYC_DISCORD_CHANNEL_DEVELOPMENT,
                    KYC_DISCORD_CHANNEL_PRODUCTION,
                    `BVN => ${verify_bvn.message} | ${process.env.NODE_ENV}`
                );

                return ResponseHandler.sendErrorResponse({
                    res,
                    code: HTTP_CODES.BAD_REQUEST,
                    error: verify_bvn.message,
                });
            } else if (verify_bvn.success && verify_bvn.statusCode === 200) {
                const { data } = verify_bvn;
                const bvn_first_name = data.firstName;
                const bvn_last_name = data.lastName;
                const user_first_name = user.first_name ?? "";
                const user_last_name = user.last_name ?? "";

                if (
                    bvn_first_name &&
                    user_first_name &&
                    bvn_last_name &&
                    user_last_name &&
                    bvn_first_name.toLowerCase() ===
                        user_first_name.trim().toLowerCase() &&
                    bvn_last_name.toLowerCase() ===
                        user_last_name.trim().toLowerCase()
                ) {
                    saved_id = await userRepository.atomicUpdate(user_id, {
                        $set: {
                            id_verification: id_type,
                            id_number: id_number,
                            id_verified: true,
                            kyc_percent: 100,
                            kyc_completed: true,
                            kyc_completed_at: new Date(),
                        },
                    });

                    if (saved_id) {
                        await discordMessageHelper(
                            req,
                            user,
                            `BVN => Your id details have been successfully verified. | ${process.env.NODE_ENV} environment ✅`,
                            KYC_DISCORD_CHANNEL_DEVELOPMENT,
                            KYC_DISCORD_CHANNEL_PRODUCTION,
                            "BVN => Your id details have been successfully verified."
                        );

                        return ResponseHandler.sendSuccessResponse({
                            res,
                            code: HTTP_CODES.CREATED,
                            message:
                                "Your id details have been successfully verified.",
                        });
                    }
                } else {
                    await discordMessageHelper(
                        req,
                        user,
                        `BVN => BVN name does not match your name. | ${process.env.NODE_ENV} environment ❌`,
                        KYC_DISCORD_CHANNEL_DEVELOPMENT,
                        KYC_DISCORD_CHANNEL_PRODUCTION,
                        "BVN => BVN name does not match your name."
                    );

                    return ResponseHandler.sendErrorResponse({
                        res,
                        code: HTTP_CODES.BAD_REQUEST,
                        error: "BVN name does not match your name.",
                    });
                }
            }
        } else if (id_type === IDType.DRIVERS_LICENSE) {
            const verify_driver_license =
                await youVerifyApiClient.driverLicenseVerification({
                    id: id_number,
                    isSubjectConsent: true,
                });

            if (!verify_driver_license.success) {
                await discordMessageHelper(
                    req,
                    user,
                    `DRIVER LICENSE => ${verify_driver_license.message} | ${process.env.NODE_ENV} environment ❌`,
                    KYC_DISCORD_CHANNEL_DEVELOPMENT,
                    KYC_DISCORD_CHANNEL_PRODUCTION,
                    `DRIVER LICENSE => ${verify_driver_license.message} | ${process.env.NODE_ENV}`
                );

                return ResponseHandler.sendErrorResponse({
                    res,
                    code: HTTP_CODES.BAD_REQUEST,
                    error: verify_driver_license.message,
                });
            } else if (
                verify_driver_license.success &&
                verify_driver_license.statusCode === 200
            ) {
                const { data } = verify_driver_license;
                const driver_first_name = data.firstName;
                const driver_last_name = data.lastName;
                const user_first_name = user.first_name ?? "";
                const user_last_name = user.last_name ?? "";

                if (
                    driver_first_name &&
                    user_first_name &&
                    driver_last_name &&
                    user_last_name &&
                    driver_first_name.toLowerCase() ===
                        user_first_name.trim().toLowerCase() &&
                    driver_last_name.toLowerCase() ===
                        user_last_name.trim().toLowerCase()
                ) {
                    saved_id = await userRepository.atomicUpdate(user_id, {
                        $set: {
                            id_verification: id_type,
                            id_number: id_number,
                            kyc_percent: 100,
                            kyc_completed: true,
                            kyc_completed_at: new Date(),
                            id_verified: true,
                        },
                    });

                    if (saved_id) {
                        await discordMessageHelper(
                            req,
                            user,
                            `DRIVER LICENSE => Your id details have been successfully verified. | ${process.env.NODE_ENV} environment ✅`,
                            KYC_DISCORD_CHANNEL_DEVELOPMENT,
                            KYC_DISCORD_CHANNEL_PRODUCTION,
                            "DRIVER LICENSE => Your id details have been successfully verified."
                        );

                        return ResponseHandler.sendSuccessResponse({
                            res,
                            code: HTTP_CODES.CREATED,
                            message:
                                "Your id details have been successfully verified.",
                        });
                    }
                } else {
                    await discordMessageHelper(
                        req,
                        user,
                        `DRIVER LICENSE => Driver license name does not match your name. | ${process.env.NODE_ENV} environment ❌`,
                        KYC_DISCORD_CHANNEL_DEVELOPMENT,
                        KYC_DISCORD_CHANNEL_PRODUCTION,
                        "DRIVER LICENSE => Driver license name does not match your name."
                    );

                    return ResponseHandler.sendErrorResponse({
                        res,
                        code: HTTP_CODES.BAD_REQUEST,
                        error: "Driver license name does not match your name.",
                    });
                }
            }
        } else if (id_type === IDType.INTERNATIONAL_PASSPORT) {
            const verify_passport =
                await youVerifyApiClient.passportVerification({
                    id: id_number,
                    lastName,
                    isSubjectConsent: true,
                });

            if (!verify_passport.success) {
                await discordMessageHelper(
                    req,
                    user,
                    `INTERNATIONAL PASSPORT => ${verify_passport.message} | ${process.env.NODE_ENV} environment ❌`,
                    KYC_DISCORD_CHANNEL_DEVELOPMENT,
                    KYC_DISCORD_CHANNEL_PRODUCTION,
                    `INTERNATIONAL PASSPORT => ${verify_passport.message} | ${process.env.NODE_ENV}`
                );

                return ResponseHandler.sendErrorResponse({
                    res,
                    code: HTTP_CODES.BAD_REQUEST,
                    error: verify_passport.message,
                });
            } else if (
                verify_passport.success &&
                verify_passport.statusCode === 200
            ) {
                const { data } = verify_passport;
                const driver_first_name = data.firstName;
                const driver_last_name = data.lastName;
                const user_first_name = user.first_name ?? "";
                const user_last_name = user.last_name ?? "";

                if (
                    driver_first_name &&
                    user_first_name &&
                    driver_last_name &&
                    user_last_name &&
                    driver_first_name.toLowerCase() ===
                        user_first_name.trim().toLowerCase() &&
                    driver_last_name.toLowerCase() ===
                        user_last_name.trim().toLowerCase()
                ) {
                    saved_id = await userRepository.atomicUpdate(user_id, {
                        $set: {
                            id_verification: id_type,
                            id_number: id_number,
                            kyc_percent: 100,
                            kyc_completed: true,
                            kyc_completed_at: new Date(),
                            id_verified: true,
                        },
                    });

                    if (saved_id) {
                        await discordMessageHelper(
                            req,
                            user,
                            `INTERNATIONAL PASSPORT => Your id details have been successfully verified. | ${process.env.NODE_ENV} environment ✅`,
                            KYC_DISCORD_CHANNEL_DEVELOPMENT,
                            KYC_DISCORD_CHANNEL_PRODUCTION,
                            "INTERNATIONAL PASSPORT => Your id details have been successfully verified."
                        );

                        return ResponseHandler.sendSuccessResponse({
                            res,
                            code: HTTP_CODES.CREATED,
                            message:
                                "Your id details have been successfully verified.",
                        });
                    }
                } else {
                    await discordMessageHelper(
                        req,
                        user,
                        `INTERNATIONAL PASSPORT => International passport name does not match your name. | ${process.env.NODE_ENV} environment ❌`,
                        KYC_DISCORD_CHANNEL_DEVELOPMENT,
                        KYC_DISCORD_CHANNEL_PRODUCTION,
                        "INTERNATIONAL PASSPORT => International passport name does not match your name."
                    );

                    return ResponseHandler.sendErrorResponse({
                        res,
                        code: HTTP_CODES.BAD_REQUEST,
                        error: "International passport name does not match your name.",
                    });
                }
            }
        } else if (id_type === IDType.NATIONAL_ID) {
            const verify_nin = await youVerifyApiClient.ninVerification({
                id: id_number,
                isSubjectConsent: true,
            });

            if (!verify_nin.success) {
                await discordMessageHelper(
                    req,
                    user,
                    `NATIONAL ID => ${verify_nin.message} | ${process.env.NODE_ENV} environment ❌`,
                    KYC_DISCORD_CHANNEL_DEVELOPMENT,
                    KYC_DISCORD_CHANNEL_PRODUCTION,
                    `NATIONAL ID => ${verify_nin.message} | ${process.env.NODE_ENV}`
                );

                return ResponseHandler.sendErrorResponse({
                    res,
                    code: HTTP_CODES.BAD_REQUEST,
                    error: verify_nin.message,
                });
            } else if (verify_nin.success && verify_nin.statusCode === 200) {
                const { data } = verify_nin;
                const nin_first_name = data.firstName;
                const nin_last_name = data.lastName;
                const user_first_name = user.first_name ?? "";
                const user_last_name = user.last_name ?? "";

                if (
                    nin_first_name &&
                    user_first_name &&
                    nin_last_name &&
                    user_last_name &&
                    nin_first_name.toLowerCase() ===
                        user_first_name.trim().toLowerCase() &&
                    nin_last_name.toLowerCase() ===
                        user_last_name.trim().toLowerCase()
                ) {
                    saved_id = await userRepository.atomicUpdate(user_id, {
                        $set: {
                            id_verification: id_type,
                            id_number: id_number,
                            kyc_percent: 100,
                            kyc_completed: true,
                            kyc_completed_at: new Date(),
                            id_verified: true,
                        },
                    });

                    if (saved_id) {
                        await discordMessageHelper(
                            req,
                            user,
                            `NATIONAL ID => Your id details have been successfully verified. | ${process.env.NODE_ENV} environment ✅`,
                            KYC_DISCORD_CHANNEL_DEVELOPMENT,
                            KYC_DISCORD_CHANNEL_PRODUCTION,
                            "NATIONAL ID => Your id details have been successfully verified."
                        );

                        return ResponseHandler.sendSuccessResponse({
                            res,
                            code: HTTP_CODES.CREATED,
                            message:
                                "Your id details have been successfully verified.",
                        });
                    }
                } else {
                    await discordMessageHelper(
                        req,
                        user,
                        `NATIONAL ID => National ID name does not match your name. | ${process.env.NODE_ENV} environment ❌`,
                        KYC_DISCORD_CHANNEL_DEVELOPMENT,
                        KYC_DISCORD_CHANNEL_PRODUCTION,
                        "NATIONAL ID => National ID name does not match your name."
                    );

                    return ResponseHandler.sendErrorResponse({
                        res,
                        code: HTTP_CODES.BAD_REQUEST,
                        error: "National ID name does not match your name.",
                    });
                }
            }
        }
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
    try {
        const user_id = throwIfUndefined(req.user, "req.user")._id;

        const { current_password, new_password, confirm_password } = req.body;

        const user = await userRepository.getById({ _id: user_id });

        if (!user) {
            return ResponseHandler.sendErrorResponse({
                res,
                code: HTTP_CODES.NOT_FOUND,
                error: `User not found. Please check your input.`,
            });
        }

        const result = bcryptjs.compareSync(current_password, user?.password!);

        if (!result) {
            return ResponseHandler.sendErrorResponse({
                res,
                code: HTTP_CODES.NOT_FOUND,
                error: "Incorrect password. Please try again.",
            });
        }

        if (new_password !== confirm_password) {
            return ResponseHandler.sendErrorResponse({
                res,
                code: HTTP_CODES.BAD_REQUEST,
                error: `Your passwords do not match. Please check and try again.`,
            });
        }

        const password = bcryptjs.hashSync(new_password, 10);

        const saved = await userRepository.atomicUpdate(user_id, {
            $set: { password: password },
        });

        if (saved) {
            return ResponseHandler.sendSuccessResponse({
                res,
                code: HTTP_CODES.CREATED,
                message: "Success! Your password has been updated.",
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

/***************
 *
 *
 * Turn on or off user pin
 *
 *
 */

export async function toggleUserPin(
    req: ExpressRequest,
    res: Response
): Promise<Response | void> {
    try {
        const user_id = throwIfUndefined(req.user, "req.user")._id;
        const { toggle_user_pin } = req.body;
        const user = await userRepository.getById({ _id: user_id });

        if (!user) {
            return ResponseHandler.sendErrorResponse({
                res,
                code: HTTP_CODES.NOT_FOUND,
                error: `User not found. Please check your input.`,
            });
        }

        if (toggle_user_pin === "true" && !user.toggle_user_pin) {
            await userRepository.atomicUpdate(user_id, {
                $set: { toggle_user_pin: true },
            });

            return ResponseHandler.sendSuccessResponse({
                res,
                code: HTTP_CODES.CREATED,
                message: "Pin setting changed successfully.",
            });
        } else {
            await userRepository.atomicUpdate(user_id, {
                $set: { toggle_user_pin: false },
            });

            return ResponseHandler.sendSuccessResponse({
                res,
                code: HTTP_CODES.CREATED,
                message: "Pin setting changed successfully.",
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

/***********
 *
 *
 * Set user PIN
 *
 *
 */

export async function setUserPin(
    req: ExpressRequest,
    res: Response
): Promise<Response | void> {
    try {
        const user_id = throwIfUndefined(req.user, "req.user")._id;

        const { pin, confirm_pin } = req.body;

        const user = await userRepository.getById({ _id: user_id });

        if (!user) {
            return ResponseHandler.sendErrorResponse({
                res,
                code: HTTP_CODES.NOT_FOUND,
                error: `User not found. Please check your input.`,
            });
        }

        if (!user.toggle_user_pin) {
            return ResponseHandler.sendErrorResponse({
                res,
                code: HTTP_CODES.NOT_FOUND,
                error: `Please enable PIN authentication first.`,
            });
        }

        if (pin.toLowerCase() !== confirm_pin.toLowerCase()) {
            return ResponseHandler.sendErrorResponse({
                res,
                code: HTTP_CODES.BAD_REQUEST,
                error: `Sorry, the entered PINs do not match. Please try again.`,
            });
        }

        const salt = await bcrypt.genSalt(parseInt("10"));
        const hash = await bcrypt.hash(pin, salt);

        const saved = await userRepository.atomicUpdate(user_id, {
            $set: {
                pin: hash,
                pin_set_at: new Date(),
                is_two_fa: true,
                two_fa_set_at: new Date(),
            },
        });

        if (saved) {
            return ResponseHandler.sendSuccessResponse({
                res,
                code: HTTP_CODES.CREATED,
                message: "You're all set!",
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

/*******************
 *
 *
 * Change user PIN
 *
 *
 */

export async function changeUserPin(
    req: ExpressRequest,
    res: Response
): Promise<Response | void> {
    try {
        const user_id = throwIfUndefined(req.user, "req.user")._id;

        const { current_pin, new_pin, confirm_pin } = req.body;

        const user = await userRepository.getById({ _id: user_id });

        if (!user) {
            return ResponseHandler.sendErrorResponse({
                res,
                code: HTTP_CODES.NOT_FOUND,
                error: `User not found. Please check your input.`,
            });
        }

        const result = await bcrypt.compare(current_pin, user?.pin!);

        if (!result) {
            return ResponseHandler.sendErrorResponse({
                res,
                code: HTTP_CODES.BAD_REQUEST,
                error: "Invalid PIN. Please enter the correct PIN and try again.",
            });
        }

        if (new_pin.toLowerCase() !== confirm_pin.toLowerCase()) {
            return ResponseHandler.sendErrorResponse({
                res,
                code: HTTP_CODES.BAD_REQUEST,
                error: `Sorry, your PINs do not match. Please double-check and try again.`,
            });
        }

        const salt = await bcrypt.genSalt(parseInt("10"));
        const hash = await bcrypt.hash(new_pin, salt);

        const saved = await userRepository.atomicUpdate(user_id, {
            $set: { pin: hash, pin_set_at: new Date() },
        });

        if (saved) {
            return ResponseHandler.sendSuccessResponse({
                res,
                code: HTTP_CODES.CREATED,
                message: `You're all set!`,
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

/*****************
 *
 *
 * Set Secret Password
 *
 */

export async function setSecretPassword(
    req: ExpressRequest,
    res: Response
): Promise<Response | void> {
    try {
        const user_id = throwIfUndefined(req.user, "req.user")._id;
        const {
            secret_password,
            confirm_secret_password,
            secret_password_hint,
        } = req.body;
        const user = await userRepository.getById({ _id: user_id });

        if (!user) {
            return ResponseHandler.sendErrorResponse({
                res,
                code: HTTP_CODES.NOT_FOUND,
                error: `User not found. Please check your input.`,
            });
        }

        if (
            secret_password.toLowerCase() !==
            confirm_secret_password.toLowerCase()
        ) {
            return ResponseHandler.sendErrorResponse({
                res,
                code: HTTP_CODES.BAD_REQUEST,
                error: `Your secret passwords don't match. Please enter the same password in both fields.`,
            });
        }

        const salt = await bcrypt.genSalt(parseInt("10"));
        const hash = await bcrypt.hash(secret_password.toLowerCase(), salt);

        const saved = await userRepository.atomicUpdate(user_id, {
            $set: {
                secret_password: hash,
                secret_password_hint,
                is_secret_password_set: true,
                secret_password_set_at: new Date(),
            },
        });

        if (saved) {
            return ResponseHandler.sendSuccessResponse({
                res,
                code: HTTP_CODES.CREATED,
                message: "You're all set!.",
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

/*******************
 *
 *
 * Change Secret Password
 *
 *
 */

export async function changeSecretPassword(
    req: ExpressRequest,
    res: Response
): Promise<Response | void> {
    try {
        const user_id = throwIfUndefined(req.user, "req.user")._id;
        const {
            current_secret,
            new_secret,
            confirm_secret,
            secret_password_hint,
        } = req.body;
        const user = await userRepository.getById({ _id: user_id });

        if (!user) {
            return ResponseHandler.sendErrorResponse({
                res,
                code: HTTP_CODES.NOT_FOUND,
                error: `User not found. Please check your input.`,
            });
        }

        const result = await bcrypt.compare(
            current_secret,
            user?.secret_password!
        );

        if (!result) {
            return ResponseHandler.sendErrorResponse({
                res,
                code: HTTP_CODES.BAD_REQUEST,
                error: "Sorry, the secret password you entered is incorrect. Please try again.",
            });
        }

        if (new_secret !== confirm_secret) {
            return ResponseHandler.sendErrorResponse({
                res,
                code: HTTP_CODES.BAD_REQUEST,
                error: `Secrets do not match.`,
            });
        }

        const salt = await bcrypt.genSalt(parseInt("10"));
        const hash = await bcrypt.hash(new_secret, salt);

        const saved = await userRepository.atomicUpdate(user_id, {
            $set: {
                secret_password: hash,
                secret_password_hint,
                is_secret_password_set: true,
                secret_password_set_at: new Date(),
            },
        });

        if (saved) {
            return ResponseHandler.sendSuccessResponse({
                res,
                code: HTTP_CODES.CREATED,
                message: `You're all set!.`,
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

/*******************
 *
 *
 * Initiate Delete Account
 *
 *
 */

export async function initiateDeleteAccount(
    req: ExpressRequest,
    res: Response
): Promise<Response | void> {
    try {
        const user_id = throwIfUndefined(req.user, "req.user")._id;

        const user = await userRepository.getById({ _id: user_id });

        if (!user) {
            return ResponseHandler.sendErrorResponse({
                res,
                code: HTTP_CODES.NOT_FOUND,
                error: `User not found. Please check your input.`,
            });
        }

        const check_portfolio = await planRepository.getAllUserPlans({
            user_id: user._id,
            plan_status: { $ne: IPortfolioStatus.COMPLETE },
        });

        if (check_portfolio.length > 0) {
            return ResponseHandler.sendErrorResponse({
                res,
                custom: true,
                code: HTTP_CODES.BAD_REQUEST,
                error: `Action not successful, this user still have active investments`,
                type: "portfolio",
            });
        }

        // ! Check only in production
        if (env.isProd) {
            const get_wallet = await walletRepository.getByUserId({
                user_id: user._id,
            });

            if (!get_wallet) {
                return ResponseHandler.sendErrorResponse({
                    res,
                    code: HTTP_CODES.BAD_REQUEST,
                    error: `Action not successful, this user has no wallet`,
                });
            }

            if (get_wallet.balance > 0) {
                return ResponseHandler.sendErrorResponse({
                    res,
                    custom: true,
                    code: HTTP_CODES.BAD_REQUEST,
                    error: `Action not successful, you still have a left over wallet balance`,
                    type: "wallet",
                });
            }
        }

        // generate a one-time-password for email verification
        const otp = await UtilFunctions.generateOtp({ user_id });

        // create an instance of current date/time
        let createdAt = new Date();

        // send a verification email to the user
        await UtilFunctions.sendEmail2("verify-otp.hbs", {
            to: user.email,
            subject: "OTP Verification",
            props: {
                email: user.email,
                otp: otp?.otp,
                name: user.first_name,
                createdAt,
            },
        });

        return ResponseHandler.sendSuccessResponse({
            res,
            code: HTTP_CODES.CREATED,
            message: `An OTP has been sent to your email address. Please check your email and enter the OTP to continue.`,
        });
    } catch (error) {
        return ResponseHandler.sendErrorResponse({
            res,
            code: HTTP_CODES.INTERNAL_SERVER_ERROR,
            error: `${error}`,
        });
    }
}

/*******************
 *
 *
 * Soft Delete Account
 *
 *
 */

export async function softDeleteAccount(
    req: ExpressRequest,
    res: Response
): Promise<Response | void> {
    try {
        const user_id = throwIfUndefined(req.user, "req.user")._id;

        const user = await userRepository.getById({ _id: user_id });

        if (!user) {
            return ResponseHandler.sendErrorResponse({
                res,
                code: HTTP_CODES.NOT_FOUND,
                error: `User not found. Please check your input.`,
            });
        }

        const { otp } = req.body;

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

        const deleted = await userRepository.atomicUpdate(user_id, {
            $set: { is_deleted: true, deleted_at: new Date() },
        });

        if (deleted) {
            return ResponseHandler.sendSuccessResponse({
                res,
                code: HTTP_CODES.CREATED,
                message: `Your account has been successfully deleted.`,
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
