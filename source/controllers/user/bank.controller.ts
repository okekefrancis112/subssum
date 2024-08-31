import { Response } from "express";
import { ExpressRequest } from "../../server";
import { stringSimilarity } from "string-similarity-js";
import ResponseHandler from "../../util/response-handler";
import { serverErrorNotification, throwIfUndefined } from "../../util";
import { paystackApiClient } from "../../integrations/paystackApiClient";
import banksRepository from "../../repositories/banks.repository";
import auditRepository from "../../repositories/audit.repository";
import {
    IAuditActivityStatus,
    IAuditActivityType,
} from "../../interfaces/audit.interface";
import { DiscordTaskJob } from "../../services/queues/producer.service";
import {
    APP_CONSTANTS,
    BANK_CARD_LINK_DISCORD_CHANNEL_DEVELOPMENT,
    BANK_CARD_LINK_DISCORD_CHANNEL_PRODUCTION,
    HTTP_CODES,
} from "../../constants/app_defaults.constant";
import userRepository from "../../repositories/user.repository";
import { IBankType } from "../../interfaces/banks.interface";
import { env } from "../../config/env.config";
import { discordMessageHelper } from "../../helpers/discord.helper";

/*****************************************
 * Get Bank List
 * This function retrieves the list of banks from Paystack API and sends it back to the client
 *
 * @param {ExpressRequest} req
 * @param {Response} res
 * @returns {Promise<Response|void>} response object or void
 */
export async function bankList(
    req: ExpressRequest,
    res: Response
): Promise<Response | void> {
    // Throw an error if req.user is undefined
    const user = throwIfUndefined(req.user, "req.user");

    try {
        // Calls the Paystack API to retrieve the list of banks
        const e = await paystackApiClient.bank_list();

        // Sends a successful response with data from Paystack
        return ResponseHandler.sendSuccessResponse({
            res,
            code: HTTP_CODES.OK,
            message: "Successful",
            data: e.data,
        });
    } catch (error) {
        // Send an error notification and then sends an error response
        await serverErrorNotification(req, error, user);
        return ResponseHandler.sendErrorResponse({
            res,
            code: HTTP_CODES.INTERNAL_SERVER_ERROR,
            error: `${error}`,
        });
    }
}

/****
 * Resolve Bank Account
 * This function resolves a bank account number and returns the account name
 *
 * @param {ExpressRequest} req
 * @param {Response} res
 * @returns {Promise<Response|void>} response object or void
 */
export async function resolveAccount(
    req: ExpressRequest,
    res: Response
): Promise<Response | void> {
    // Get the user from request
    const user = throwIfUndefined(req.user, "req.user");
    try {
        // Get the account number and bank code from the body of the request
        const { account_number, bank_code } = req.body;

        try {
            // Get account data from Paystack Api Client
            const e = await paystackApiClient.resolve_account_number(
                account_number,
                bank_code
            );

            await discordMessageHelper(
                req,
                user,
                "Resolve Account ✅",
                BANK_CARD_LINK_DISCORD_CHANNEL_DEVELOPMENT,
                BANK_CARD_LINK_DISCORD_CHANNEL_PRODUCTION,
                "BANK",
                {
                    "Account Number": account_number,
                    "Bank Code": bank_code,
                    "Account Name": e.data.account_name,
                }
            );

            // Create Audit Logs
            await auditRepository.create({
                req,
                title: "Resolve Account",
                name: `${user.first_name} ${user.last_name}`,
                activity_type: IAuditActivityType.ACCESS,
                activity_status: IAuditActivityStatus.SUCCESS,
                user: user._id,
            });

            // Return response with account data
            return ResponseHandler.sendSuccessResponse({
                res,
                code: HTTP_CODES.OK,
                message: "Successful",
                data: e.data,
            });
        } catch (e) {
            await discordMessageHelper(
                req,
                user,
                "Could not resolve account number ❌",
                BANK_CARD_LINK_DISCORD_CHANNEL_DEVELOPMENT,
                BANK_CARD_LINK_DISCORD_CHANNEL_PRODUCTION,
                "BANK",
                {
                    "Account Number": account_number,
                    "Bank Code": bank_code,
                }
            );

            // Create Audit Logs
            await auditRepository.create({
                req,
                title: `Invalid account number. Please check and try again.`,
                name: `${user.first_name} ${user.last_name}`,
                activity_type: IAuditActivityType.ACCESS,
                activity_status: IAuditActivityStatus.FAILURE,
                user: user._id,
            });
            // Return error response
            return ResponseHandler.sendErrorResponse({
                res,
                code: HTTP_CODES.NOT_FOUND,
                error: `Invalid account number. Please check and try again.`,
            });
        }
    } catch (error) {
        // Send notification for server error
        await serverErrorNotification(req, error, user);
        // Return error response
        return ResponseHandler.sendErrorResponse({
            res,
            code: HTTP_CODES.INTERNAL_SERVER_ERROR,
            error: `${error}`,
        });
    }
}

/****
 * This function is used to add a new bank. It verifies if the bank is already added, if user exists and
 * if the account name connected to the provided bank account matches the user's first and last name.
 * If all checks are completed, it adds the bank to the user profile and sends success msg.
 * Else it throws an error.
 * @param {ExpressRequest} req
 * @param {Response} res
 * @returns {Promise<Response|void>} response object or void
 */

export async function addBank(
    req: ExpressRequest,
    res: Response
): Promise<Response | void> {
    // Throw an error if req.user is undefined
    const user = throwIfUndefined(req.user, "req.user");

    try {
        // Get the user by their provided id
        const check_user = await userRepository.getById({ _id: user._id });

        // If the user is not found, return Not Found response
        if (!check_user) {
            return ResponseHandler.sendErrorResponse({
                res,
                code: HTTP_CODES.NOT_FOUND,
                error: "User not found",
            });
        }

        // Extract body data for bank
        const { country, bank_name, account_number, account_name, primary } =
            req.body;

        // Check if a bank already exists with the provided account_number
        const checkBank = await banksRepository.getOne({ account_number });

        // If a bank exists with the provided account_number, send conflict response
        if (checkBank) {
            // Bank Discord Notification
            const discordMessage = `
        First Name:- ${user?.first_name!},
        Last Name:- ${user?.last_name!},
        Email:- ${user?.email!},
        path:- ${req.originalUrl},
        Account account:- ${account_number},
        Bank name:- ${bank_name},
        Account name:- ${account_name},
        Default:- ${primary}
      `;
            await DiscordTaskJob({
                name: "Bank has already been added",
                data: {
                    title: `Bank has already been added | ${process.env.NODE_ENV} environment `,
                    message: discordMessage,
                    channel_link: env.isDev
                        ? BANK_CARD_LINK_DISCORD_CHANNEL_DEVELOPMENT
                        : BANK_CARD_LINK_DISCORD_CHANNEL_PRODUCTION,
                },
            });
            // Audit
            await auditRepository.create({
                req,
                title: `Add Bank`,
                name: `${user.first_name} ${user.last_name}`,
                activity_type: IAuditActivityType.ACCESS,
                activity_status: IAuditActivityStatus.FAILURE,
                user: user._id,
                data: discordMessage,
            });

            return ResponseHandler.sendErrorResponse({
                res,
                code: HTTP_CODES.CONFLICT,
                error: `This bank account has already been added`,
            });
        }

        // Set primary to false for all other banks if primary is set to true
        if (primary) {
            await banksRepository.updateAll(
                { user_id: user._id },
                { $set: { primary: false } }
            );
        }

        const user_name = `${check_user.first_name} ${check_user.last_name} ${
            check_user.middle_name ? check_user.middle_name : ""
        }`;

        // Compare the account name and user name given to us
        const check_names = stringSimilarity(
            `${account_name.toLowerCase()}`,
            user_name.toLocaleLowerCase()
        );

        // If account name doesn't match the user name given, send bad request response
        if (Number(check_names) < APP_CONSTANTS.GENERAL.LIKELINESS_THRESHOLD) {
            // Bank Discord Notification
            const discordMessage = `
        First Name:- ${user?.first_name!},
        Last Name:- ${user?.last_name!},
        Email:- ${user?.email!},
        path:- ${req.originalUrl},
        Account account:- ${account_number},
        Bank name:- ${bank_name},
        Account name:- ${account_name},
        Default:- ${primary}
      `;
            await DiscordTaskJob({
                name: "Account name does not match user name",
                data: {
                    title: `Account name does not match user name | ${process.env.NODE_ENV} environment `,
                    message: discordMessage,
                    channel_link: env.isDev
                        ? BANK_CARD_LINK_DISCORD_CHANNEL_DEVELOPMENT
                        : BANK_CARD_LINK_DISCORD_CHANNEL_PRODUCTION,
                },
            });
            // Audit
            await auditRepository.create({
                req,
                title: `Account name does not match user name`,
                name: `${user.first_name} ${user.last_name}`,
                activity_type: IAuditActivityType.ACCESS,
                activity_status: IAuditActivityStatus.FAILURE,
                user: user._id,
                data: discordMessage,
            });

            return ResponseHandler.sendErrorResponse({
                res,
                code: HTTP_CODES.BAD_REQUEST,
                error: `Account name does not match user name`,
            });
        }

        // Create bank using the extracted parameters
        const saved = await banksRepository.create({
            country,
            user_id: user._id,
            bank_name,
            account_number,
            account_name,
            primary,
        });

        // Bank Discord Notification
        const discordMessage = `
    First Name:- ${user?.first_name!},
    Last Name:- ${user?.last_name!},
    Email:- ${user?.email!},
    path:- ${req.originalUrl},
    Account account:- ${account_number},
    Bank name:- ${bank_name},
    Account name:- ${account_name},
    Default:- ${primary}
  `;
        await DiscordTaskJob({
            name: "Bank added",
            data: {
                title: `Bank addition | ${process.env.NODE_ENV} environment `,
                message: discordMessage,
                channel_link: env.isDev
                    ? BANK_CARD_LINK_DISCORD_CHANNEL_DEVELOPMENT
                    : BANK_CARD_LINK_DISCORD_CHANNEL_PRODUCTION,
            },
        });

        // Audit
        await auditRepository.create({
            req,
            title: `Bank addition attempt`,
            name: `${user.first_name} ${user.last_name}`,
            activity_type: IAuditActivityType.ACCESS,
            activity_status: IAuditActivityStatus.SUCCESS,
            user: user._id,
            data: discordMessage,
        });

        return ResponseHandler.sendSuccessResponse({
            res,
            code: HTTP_CODES.CREATED,
            message: "Success! Your bank account has been saved",
            data: saved,
        });
    } catch (error) {
        // Send server error notification on any error that might have been caught
        await serverErrorNotification(req, error, user);
        // Return Internal Server Error response
        return ResponseHandler.sendErrorResponse({
            res,
            code: HTTP_CODES.INTERNAL_SERVER_ERROR,
            error: `${error}`,
        });
    }
}

/****
 * This function is used to add a new foreign bank. It verifies if the bank is already added, if user exists and
 * if the account name connected to the provided bank account matches the user's first and last name.
 * If all checks are completed, it adds the foreign bank account to the user profile and sends success msg.
 * Else it throws an error.
 * @param {ExpressRequest} req
 * @param {Response} res
 * @returns {Promise<Response|void>} response object or void
 */

export async function addForeignBank(
    req: ExpressRequest,
    res: Response
): Promise<Response | void> {
    // Throw an error if req.user is undefined
    const user = throwIfUndefined(req.user, "req.user");

    try {
        // Get the user by their provided id
        const check_user = await userRepository.getById({ _id: user._id });

        // If the user is not found, return Not Found response
        if (!check_user) {
            return ResponseHandler.sendErrorResponse({
                res,
                code: HTTP_CODES.NOT_FOUND,
                error: "User not found",
            });
        }

        // Extract body data for bank
        const {
            bank_name,
            account_type,
            account_number,
            sort_code,
            primary,
            account_name,
            swift_code,
            wire_routing,
            bank_address,
            iban,
        } = req.body;

        // Check if a bank already exists with the provided account_number
        const checkBank = await banksRepository.getOne({ account_number });

        // Check if a bank already exists with the provided account_number
        // const checkIban = Object.keys(req.body.iban).length === 0 ? null : req.body.iban;

        if (
            // new_bank == 'yes' &&
            !account_type ||
            !bank_name ||
            !swift_code ||
            (account_type !== IBankType.USD && !sort_code) ||
            !account_number ||
            (account_type === IBankType.USD && !wire_routing) ||
            !bank_address ||
            !account_name ||
            (account_type !== IBankType.USD && !iban)
        ) {
            let missing_field;
            if (!swift_code) {
                missing_field = "swift_code";
            } else if (!bank_name) {
                missing_field = "bank_name";
            } else if (!account_number) {
                missing_field = "account_number";
            } else if (!account_type) {
                missing_field = "account_type";
            } else if (!wire_routing && account_type === "USD") {
                missing_field = "wire_routing";
            } else if (!bank_address) {
                missing_field = "bank_address";
            } else if (!account_name) {
                missing_field = "account_name";
            } else if (!iban && account_type !== IBankType.USD) {
                missing_field = "iban";
            } else if (!sort_code && account_type !== IBankType.USD) {
                missing_field = "sort";
            }

            return ResponseHandler.sendErrorResponse({
                res,
                code: HTTP_CODES.NOT_FOUND,
                error: `Please enter your ${missing_field} code.`,
            });
        }

        const checkIban = account_type === IBankType.USD ? null : iban;
        const checkSortCode = account_type === IBankType.USD ? null : sort_code;
        const checkWire_routing =
            account_type === IBankType.USD ? wire_routing : null;

        // If a bank exists with the provided account_number, send conflict response
        if (checkBank) {
            // Bank Discord Notification
            const discordMessage = `
        First Name:- ${user?.first_name!},
        Last Name:- ${user?.last_name!},
        Email:- ${user?.email!},
        path:- ${req.originalUrl},
        Account account:- ${account_number},
        Account type:- ${account_type},
        Bank name:- ${bank_name},
        Account name:- ${account_name},
        Swift code: ${swift_code},
        Sort code: ${checkSortCode},
        Wire routing: ${checkWire_routing},
        Bank address: ${bank_address},
        Default:- ${primary},
        iban: ${checkIban},
      `;
            await DiscordTaskJob({
                name: "Bank has already been added",
                data: {
                    title: `Bank has already been added | ${process.env.NODE_ENV} environment `,
                    message: discordMessage,
                    channel_link: env.isDev
                        ? BANK_CARD_LINK_DISCORD_CHANNEL_DEVELOPMENT
                        : BANK_CARD_LINK_DISCORD_CHANNEL_PRODUCTION,
                },
            });
            // Audit
            await auditRepository.create({
                req,
                title: `Add Bank`,
                name: `${user.first_name} ${user.last_name}`,
                activity_type: IAuditActivityType.ACCESS,
                activity_status: IAuditActivityStatus.FAILURE,
                user: user._id,
                data: discordMessage,
            });

            return ResponseHandler.sendErrorResponse({
                res,
                code: HTTP_CODES.CONFLICT,
                error: `This bank account has already been added`,
            });
        }

        // Set primary to false for all other banks if primary is set to true
        if (primary) {
            await banksRepository.updateAll(
                { user_id: user._id },
                { $set: { primary: false } }
            );
        }

        const user_name = `${check_user.first_name} ${check_user.last_name} ${
            check_user.middle_name ? check_user.middle_name : ""
        }`;

        // Compare the account name and user name given to us
        const check_names = stringSimilarity(
            `${account_name.toLowerCase()}`,
            user_name.toLocaleLowerCase()
        );

        // If account name doesn't match the user name given, send bad request response
        if (Number(check_names) < APP_CONSTANTS.GENERAL.LIKELINESS_THRESHOLD) {
            // Bank Discord Notification
            const discordMessage = `
        First Name:- ${user?.first_name!},
        Last Name:- ${user?.last_name!},
        Email:- ${user?.email!},
        path:- ${req.originalUrl},
        Account account:- ${account_number},
        Account type:- ${account_type},
        Bank name:- ${bank_name},
        Account name:- ${account_name},
        Swift code: ${swift_code},
        Sort code: ${checkSortCode},
        Wire routing: ${checkWire_routing},
        Bank address: ${bank_address},
        Default:- ${primary},
        iban: ${checkIban},
      `;
            await DiscordTaskJob({
                name: "Account name does not match user name",
                data: {
                    title: `Account name does not match user name | ${process.env.NODE_ENV} environment `,
                    message: discordMessage,
                    channel_link: env.isDev
                        ? BANK_CARD_LINK_DISCORD_CHANNEL_DEVELOPMENT
                        : BANK_CARD_LINK_DISCORD_CHANNEL_PRODUCTION,
                },
            });
            // Audit
            await auditRepository.create({
                req,
                title: `Account name does not match user name`,
                name: `${user.first_name} ${user.last_name}`,
                activity_type: IAuditActivityType.ACCESS,
                activity_status: IAuditActivityStatus.FAILURE,
                user: user._id,
                data: discordMessage,
            });

            return ResponseHandler.sendErrorResponse({
                res,
                code: HTTP_CODES.BAD_REQUEST,
                error: `Account name does not match user name`,
            });
        }

        // Create bank using the extracted parameters
        const saved = await banksRepository.createForeign({
            user_id: user._id,
            bank_name,
            account_number,
            account_name,
            account_type,
            iban: checkIban,
            sort_code: checkSortCode,
            swift_code,
            wire_routing: checkWire_routing,
            bank_address,
            primary,
        });

        // Bank Discord Notification
        const discordMessage = `
      First Name:- ${user?.first_name!},
      Last Name:- ${user?.last_name!},
      Email:- ${user?.email!},
      path:- ${req.originalUrl},
      Account account:- ${account_number},
      Account type:- ${account_type},
      Bank name:- ${bank_name},
      Account name:- ${account_name},
      Swift code: ${swift_code},
      Sort code: ${checkSortCode},
      Wire routing: ${checkWire_routing},
      Bank address: ${bank_address},
      Default:- ${primary},
      iban: ${checkIban},
  `;
        await DiscordTaskJob({
            name: "Bank added",
            data: {
                title: `Bank addition | ${process.env.NODE_ENV} environment `,
                message: discordMessage,
                channel_link: env.isDev
                    ? BANK_CARD_LINK_DISCORD_CHANNEL_DEVELOPMENT
                    : BANK_CARD_LINK_DISCORD_CHANNEL_PRODUCTION,
            },
        });

        // Audit
        await auditRepository.create({
            req,
            title: `Bank addition attempt`,
            name: `${user.first_name} ${user.last_name}`,
            activity_type: IAuditActivityType.ACCESS,
            activity_status: IAuditActivityStatus.SUCCESS,
            user: user._id,
            data: discordMessage,
        });

        return ResponseHandler.sendSuccessResponse({
            res,
            code: HTTP_CODES.CREATED,
            message: "Success! Your bank account has been saved",
            data: saved,
        });
    } catch (error) {
        // Send server error notification on any error that might have been caught
        await serverErrorNotification(req, error, user);
        // Return Internal Server Error response
        return ResponseHandler.sendErrorResponse({
            res,
            code: HTTP_CODES.INTERNAL_SERVER_ERROR,
            error: `${error}`,
        });
    }
}

// Delete Bank

/**
 * @param {ExpressRequest} req
 * @param {Response} res
 * @returns {Promise<Response|void>} response object or void
 */
// Function that takes in an Express Request and a Response and returns a Promise of the response or void
export async function deleteBank(
    req: ExpressRequest,
    res: Response
): Promise<Response | void> {
    // Throw error if req.user is undefined
    const user = throwIfUndefined(req.user, "req.user");

    try {
        // Get the bank associated with the id passed as a param
        const bank = await banksRepository.getOne({ _id: req.params.bank_id });

        // If the bank does not exist, send an error response
        if (!bank) {
            return ResponseHandler.sendErrorResponse({
                res,
                code: HTTP_CODES.NOT_FOUND,
                error: `Sorry, this bank account does not exist. Please input your correct details.`,
            });
        }

        // If the bank fetched is the primary bank, send an error message
        // Send a discord notification to the Bank Link Discord Channel
        // Create an audit log entry
        if (bank.primary) {
            const discordMessage = `First Name:- ${user?.first_name!},
		  Last Name:- ${user?.last_name!},
		  Email:- ${user?.email!},
		  path:- ${req.originalUrl},
		  Account account:- ${bank.account_number},
		  Bank name:- ${bank.bank_name},
		  Account name:- ${bank.account_name},
		  Default:- ${bank.primary}`;

            await DiscordTaskJob({
                name: "Error deleting bank",
                data: {
                    title: `Default / Primary Bank cannot be removed, assign default to another before deleting | ${process.env.NODE_ENV} environment `,
                    message: discordMessage,
                    channel_link: env.isDev
                        ? BANK_CARD_LINK_DISCORD_CHANNEL_DEVELOPMENT
                        : BANK_CARD_LINK_DISCORD_CHANNEL_PRODUCTION,
                },
            });

            // Audit
            await auditRepository.create({
                req,
                title: `Delete Bank attempt - Default / Primary Bank cannot be removed, assign default to another before deleting`,
                name: `${user.first_name} ${user.last_name}`,
                activity_type: IAuditActivityType.ACCESS,
                activity_status: IAuditActivityStatus.FAILURE,
                user: user._id,
                data: discordMessage,
            });

            return ResponseHandler.sendErrorResponse({
                res,
                code: HTTP_CODES.BAD_REQUEST,
                error: `Cannot delete Bank. Please choose a default bank account before deleting.`,
            });
        }

        // If all conditions are met, delete the bank from the database
        const deleted = await banksRepository.deleteOne({
            $and: [{ user_id: user._id }, { _id: req.params.bank_id }],
        });

        // If the query was successful, create a discord message with the necessary details
        // Create an appropriate audit log entry
        // Return a success response
        if (deleted) {
            const discordMessage = `
			  First Name:- ${user?.first_name!},
			  Last Name:- ${user?.last_name!},
			  Email:- ${user?.email!},
			  path:- ${req.originalUrl}
			`;
            await DiscordTaskJob({
                name: "Bank Deleted",
                data: {
                    title: `Bank deletion | ${process.env.NODE_ENV} environment `,
                    message: discordMessage,
                    channel_link: env.isDev
                        ? BANK_CARD_LINK_DISCORD_CHANNEL_DEVELOPMENT
                        : BANK_CARD_LINK_DISCORD_CHANNEL_PRODUCTION,
                },
            });

            // Audit
            await auditRepository.create({
                req,
                title: "Bank deleted successfully",
                name: `${user.first_name} ${user.last_name}`,
                activity_type: IAuditActivityType.ACCESS,
                activity_status: IAuditActivityStatus.SUCCESS,
                user: user._id,
            });

            return ResponseHandler.sendSuccessResponse({
                res,
                code: HTTP_CODES.OK,
                message: "Success! Your bank account has been deleted.",
            });
        }
    } catch (error) {
        // Catch any errors that may occur and notify the server error
        await serverErrorNotification(req, error, user);
        return ResponseHandler.sendErrorResponse({
            res,
            code: HTTP_CODES.INTERNAL_SERVER_ERROR,
            error: `${error}`,
        });
    }
}

/**
 *
 * @param {ExpressRequest} req
 * @param {Response} res
 * @returns {Promise<Response|void>} response object or void
 */

// This function assigns a specified bank as the default for a specified user
export async function assignDefault(
    req: ExpressRequest,
    res: Response
): Promise<Response | void> {
    // Get the user associated with the request
    const user = throwIfUndefined(req.user, "req.user");
    try {
        // Get the bank associated with the given bank_id parameter
        const bank = await banksRepository.getOne({ _id: req.params.bank_id });

        // Check if the bank exists
        if (!bank) {
            // Send an appropriate response and error message if the bank does not exist
            return ResponseHandler.sendErrorResponse({
                res,
                code: HTTP_CODES.NOT_FOUND,
                error: `Bank does not exist`,
            });
        }

        // Check if the bank is already set to primary
        if (bank.primary) {
            // Send Discord notification
            const discordMessage = `
		  First Name:- ${user?.first_name!},
		  Last Name:- ${user?.last_name!},
		  Email:- ${user?.email!},
		  path:- ${req.originalUrl},
		  Account account:- ${bank.account_number},
		  Bank name:- ${bank.bank_name},
		  Account name:- ${bank.account_name},
		  Default:- ${bank.primary}
		`;
            await DiscordTaskJob({
                name: "Bank already Default / Primary",
                data: {
                    title: `Bank already Default / Primary | ${process.env.NODE_ENV} environment `,
                    message: discordMessage,
                    channel_link: env.isDev
                        ? BANK_CARD_LINK_DISCORD_CHANNEL_DEVELOPMENT
                        : BANK_CARD_LINK_DISCORD_CHANNEL_PRODUCTION,
                },
            });
            // Create an audit log entry
            await auditRepository.create({
                req,
                title: "Assign Bank",
                name: `${user.first_name} ${user.last_name}`,
                activity_type: IAuditActivityType.ACCESS,
                activity_status: IAuditActivityStatus.FAILURE,
                user: user._id,
                data: discordMessage,
            });
            // Send an appropriate response and error message if the bank is set to primary

            return ResponseHandler.sendErrorResponse({
                res,
                code: HTTP_CODES.CONFLICT,
                error: `Sorry, this bank account has already been set as your default account.`,
            });
        }

        // Set all other banks for the user to non-primary
        await banksRepository.updateAll(
            { user_id: user._id },
            { $set: { primary: false } }
        );

        // Set the specified bank to primary
        const update = await banksRepository.updateOne(
            { _id: req.params.bank_id },
            { $set: { primary: true } }
        );

        if (update) {
            // Send Discord notification
            const discordMessage = `
			  First Name:- ${user?.first_name!},
			  Last Name:- ${user?.last_name!},
			  Email:- ${user?.email!},
			  path:- ${req.originalUrl},
			  Account account:- ${bank.account_number},
			  Bank name:- ${bank.bank_name},
			  Account name:- ${bank.account_name},
			  Default:- ${bank.primary}
			`;
            await DiscordTaskJob({
                name: "Default bank assigned",
                data: {
                    title: `Default bank assigned | ${process.env.NODE_ENV} environment `,
                    message: discordMessage,
                    channel_link: env.isDev
                        ? BANK_CARD_LINK_DISCORD_CHANNEL_DEVELOPMENT
                        : BANK_CARD_LINK_DISCORD_CHANNEL_PRODUCTION,
                },
            });
            // Create an audit log entry
            await auditRepository.create({
                req,
                title: "Default Bank assigned",
                name: `${user.first_name} ${user.last_name}`,
                activity_type: IAuditActivityType.ACCESS,
                activity_status: IAuditActivityStatus.SUCCESS,
                user: user._id,
                data: discordMessage,
            });
            // Send an appropriate response and success message after the bank is successfully set to primary

            return ResponseHandler.sendSuccessResponse({
                res,
                code: HTTP_CODES.CREATED,
                message:
                    "Success! This bank account is now your default account.",
            });
        }
    } catch (error) {
        // Handle server errors appropriately
        await serverErrorNotification(req, error, user);
        return ResponseHandler.sendErrorResponse({
            res,
            code: HTTP_CODES.INTERNAL_SERVER_ERROR,
            error: `${error}`,
        });
    }
}

/**
 * Get banks
 *
 * @param req Express request object
 * @param res Response object
 * @returns Promise<Response | void>
 */
export async function getBanks(
    req: ExpressRequest,
    res: Response
): Promise<Response | void> {
    const user = throwIfUndefined(req.user, "req.user"); // Check if req.user is defined and throw an error if not
    try {
        const bank = await banksRepository.getAll({ user_id: user._id }); // Get all banks associated with the user in req
        if (bank) {
            return ResponseHandler.sendSuccessResponse({
                // Send success response with data
                res,
                code: HTTP_CODES.CREATED,
                message: "Bank account fetch successful.",
                data: bank,
            });
        }
    } catch (error) {
        await serverErrorNotification(req, error, user); // Notify server administrators of any errors
        return ResponseHandler.sendErrorResponse({
            // Send error response with message
            res,
            code: HTTP_CODES.INTERNAL_SERVER_ERROR,
            error: `${error}`,
        });
    }
}
