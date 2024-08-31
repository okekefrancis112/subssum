//Importing various modules
import path from "path";
import crypto from "crypto";
import fs from "fs";
const pdf = require("pdf-creator-node");
import Mailgun from "mailgun-js";
import * as handlebars from "handlebars";
import moment from "moment";
import { Parser } from "json2csv";
const Email = require("keystone-email");
import { UploadedFile } from "express-fileupload";
import jwt from "jsonwebtoken";
import { Types } from "mongoose";
import { ExpressRequest, ExpressResponse } from "../server";
import { Namespaces } from "../constants/namespace.constant";
//Importing repositories for various models
import otpRepository from "../repositories/otp.repository";
import walletRepository from "../repositories/wallet.repository";
import auditRepository from "../repositories/audit.repository";
import userRepository from "../repositories/user.repository";
//Importing configuration variables
import {
    MAILGUNKEY,
    MAILGUNDOMAIN,
    TOKEN_EXPIRE_TIME,
    SERVER_TOKEN_ISSUER,
    SERVER_TOKEN_SECRET,
} from "../config/env.config";
//Utlities
import Logger from "../util/logger";
import { DiscordTaskJob } from "../services/queues/producer.service";
import {
    GENERAL_ERROR_DISCORD_CHANNEL_DEVELOPMENT,
    GENERAL_ERROR_DISCORD_CHANNEL_PRODUCTION,
    HTTP_CODES,
    ngn_rate,
    urls,
    usd_rate,
} from "../constants/app_defaults.constant";
//Interfaces
import {
    IAuditActivityStatus,
    IAuditActivityType,
} from "../interfaces/audit.interface";
// environment
import { env } from "../config/env.config";
import {
    IKebleTransactionType,
    IPaymentGateway,
    ITransactionMedium,
} from "../interfaces/transaction.interface";
import { IUser } from "../interfaces/user.interface";
import { discordMessageHelper } from "../helpers/discord.helper";
import ImageService from "../services/image.service";
import ResponseHandler from "./response-handler";
import {
    IInvestmentCategory,
    IPortfolioOccurrence,
} from "../interfaces/plan.interface";
import {
    IInvestmentStatus,
    IInvestmentType,
    IReinvest,
} from "../interfaces/investment.interface";
import { ICurrency } from "../interfaces/exchange-rate.interface";

const logger = new Logger("general", Namespaces.FUNCTIONS);

export const getFirstDayOfMonth = (year: number, month: number) => {
    return new Date(year, month - 1, 1);
};

export const getNumberOfDaysInMonth = () => {
    const date = new Date();
    return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
};

export const checkIfEmpty = (value: any) => {
    if (value === null || value === undefined) {
        return true;
    }

    if (typeof value === "object") {
        return Object.keys(value).length === 0;
    }

    if (Array.isArray(value) && value.length === 0) {
        return true;
    }

    return typeof value === "string" && value.trim().length === 0;
};

export const switchDate = (value: string) => {
    const [day, month, year] = value.split("-");
    return `${year}-${month}-${day}`;
};

class UtilFunctions {
    // =====================================================================================================

    public static generateRef({ length }: { length: number }) {
        let characters =
            "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
        let result = "";

        for (let i = 0; i < length; i++) {
            result += characters[Math.floor(Math.random() * characters.length)];
        }
        return result;
    }

    // =====================================================================================================

    // This function is used to generate a referral code with upper case characters
    public static generateReferralCode() {
        return UtilFunctions.generateRef({ length: 6 }).toUpperCase();
    }

    // =====================================================================================================

    // This function is used to generate a Transaction Reference with upper case characters
    public static generateTXRef() {
        const key = `KEBLE_TX_REF${this.generateRef({
            length: 12,
        })}`.toUpperCase();
        return key;
    }

    // =====================================================================================================

    // This function is used to generate a Transaction Hash with upper case characters
    public static generateTXHash() {
        return `KEBLE_TX_HASH_REF${this.generateRef({
            length: 12,
        })}`.toUpperCase();
    }

    // =====================================================================================================

    // This function is used to check if a given value is empty or not
    public static isEmpty(value: any): boolean {
        if (value === null || value === undefined) {
            return true;
        }

        if (typeof value === "object") {
            return Object.keys(value).length === 0;
        }

        return typeof value === "string" && value.trim().length === 0;
    }

    // =====================================================================================================
    // This function is used to generate a random string of hexadecimal characters
    // with a default length of 16.
    public static generateRandomString = (length = 16) => {
        // Generates a set of random bytes with the specified length
        const randomBytes = crypto.randomBytes(length);
        // Convert the random bytes to a hexadecimal string and return it
        return randomBytes.toString("hex");
    };

    // =====================================================================================================

    // Function to generate a wallet account number
    // Generates a random account number for the wallet
    public static async generateWalletAccountNumber(): Promise<any> {
        // Generate a random 7-digit number
        const result = `321${Math.floor(Math.random() * 9000000) + 1000000}`;

        // Check if the generated account number already exists in the database
        const checkWallets = await walletRepository.getByAccountNumber({
            wallet_account_number: result,
        });

        // If the account number exists, generate a new one and return it, else return the current one
        return checkWallets
            ? await UtilFunctions.generateWalletAccountNumber()
            : result;
    }
    // =====================================================================================================

    // Generates an OTP for a given user_id
    public static async generateOtp({
        user_id,
        token,
        mins = 15,
    }: {
        user_id: Types.ObjectId;
        token?: string;
        mins?: number;
    }) {
        if (env.isDev) {
            const ttl = mins * 60 * 1000;

            const otp = 1234;

            // Set the expiration date of the OTP
            const expires_in = new Date(Date.now() + ttl);
            const check_otp = await otpRepository.getOtpByUser({ user_id });
            if (!check_otp) {
                // Create a new OTP record in the database
                return otpRepository.create({
                    user_id: user_id,
                    otp: otp,
                    token: token,
                    expires_in: expires_in,
                });
            } else {
                // Update the existing OTP record in the database
                return otpRepository.updateOtp({
                    user_id,
                    otp,
                    token,
                    expires_in,
                });
            }
        } else {
            // Generate a random 4-digit number
            const otp = Math.floor(Math.random() * 8999 + 1000);
            // Set the time to live (in milliseconds)
            const ttl = mins * 60 * 1000;

            // Set the expiration date of the OTP
            const expires_in = new Date(Date.now() + ttl);

            // Check if the user already has an OTP
            const check_otp = await otpRepository.getOtpByUser({ user_id });
            if (!check_otp) {
                // Create a new OTP record in the database
                return otpRepository.create({
                    user_id: user_id,
                    otp: otp,
                    token: token,
                    expires_in: expires_in,
                });
            } else {
                // Update the existing OTP record in the database
                return otpRepository.updateOtp({
                    user_id,
                    otp,
                    token,
                    expires_in,
                });
            }
        }
    }

    // =====================================================================================================

    // Generate a 4-digit random OTP for admin
    public static async generateAdminOtp({
        admin_id,
    }: {
        admin_id: Types.ObjectId;
    }) {
        // Generate a 4-digit random number between 1000 and 9999
        const otp = Math.floor(Math.random() * 9000 + 1000);
        // Set time to live of the OTP to 15 minutes in milliseconds
        const ttl = 15 * 60 * 1000;
        // Calculate expiry timestamp of the OTP
        const expires_in = new Date(Date.now() + ttl);

        // Check if an OTP exists for the admin
        let check_otp = await otpRepository.getOtpByAdmin({ admin_id });
        // If an OTP exists, update it with the new one
        if (check_otp) {
            return otpRepository.updateAdminOtp({ admin_id, otp, expires_in });
        }
        // Otherwise, create a new OTP for the admin
        return otpRepository.create({
            admin_id,
            otp,
            expires_in,
        });
    }

    // =====================================================================================================
    // Send Email

    /**
     * @param TEMPLATE
     * @param subject
     * @param to
     * @param props
     * @param message
     */

    // Function to send emails using Mailgun API
    public static async sendEmail(
        TEMPLATE: any, // Template of the email message
        { to = [] as any, subject = "", props = {}, attachment = null } // Options object with details like receiver, sender, subject and other optional properties
    ) {
        const cb = (err: any, info: any) => {
            // Callback function when sending mail is complete
            if (err) {
                logger.error(err, ":=> Error Response = Mailer");
                return false;
            }
            logger.info(info, ":=> Info Response = Mailer");
            return true;
        };
        let mailOptions = {
            // Setup mail details
            apiKey: MAILGUNKEY,
            domain: MAILGUNDOMAIN,
            to: to,
            from: {
                // Details of sender
                name: "Keble",
                email: "no-reply@keble.co",
            },
            subject: subject,
            attachment,
        };

        // Return new Email Object
        return new Email(path.join(__dirname, `../views/emails/${TEMPLATE}`), {
            transport: "mailgun",
        }).send(
            { ...props },
            mailOptions, // Set up mail options using Mailgun
            function (err: any, result: any) {
                if (err) {
                    logger.error("🤕 Mailgun test failed with error:\n", err);
                } else {
                    logger.info(
                        "📬 Successfully sent Mailgun test with result:\n",
                        result
                    );
                }
            },
            cb // Callback function to be executed when complete
        );
    }

    // =====================================================================================================

    public static async sendEmail2(
        template: any,
        { to = "", subject = "", props = {}, attachment = "" }
    ) {
        // create a Mailgun instance
        const mg = new Mailgun({
            apiKey: String(MAILGUNKEY),
            domain: String(MAILGUNDOMAIN),
        });

        // Read the Handlebars template file
        const templateSource = fs.readFileSync(
            path.join(__dirname, `../views/emails/${template}`),
            "utf8"
        );

        // Compile the template
        const template_file = handlebars.compile(templateSource);

        // Send the email
        mg.messages().send(
            {
                from: `Keble <no-reply@keble.co>`,
                to,
                subject: subject,
                attachment: attachment,
                html: template_file(props as any),
                ...props,
            },
            (err, body) => {
                if (err) {
                    logger.error("🤕 Mailgun test failed with error:\n", err);
                } else {
                    logger.info(
                        "📬 Successfully sent Mailgun test with result:\n",
                        body
                    );
                }
            }
        );
    }

    // =====================================================================================================
    /** Generate and sign a user Token */
    public static async generateToken(
        data: any,
        timeToLive: any = `${TOKEN_EXPIRE_TIME}`,
        secret: any = `${SERVER_TOKEN_SECRET}`
    ) {
        return new Promise((resolve, _reject) => {
            const signOptions: any = {
                issuer: `${SERVER_TOKEN_ISSUER}`,
                subject: "Keble. [Author: Valentine Offiah.]",
                algorithm: "HS256",
                audience: ["Nigerians & Diaspora"],
            };
            signOptions.expiresIn = timeToLive;

            jwt.sign(data, secret, signOptions, (err: any, token: any) => {
                if (err) {
                    logger.error(err.message);
                }

                resolve(token);
            });
        });
    }

    // =====================================================================================================
    /** Generate and sign a user Token */
    public static async verifyToken(token: any) {
        try {
            const decoded = jwt.verify(token, `${SERVER_TOKEN_SECRET}`);
            return { status: true, decoded };
        } catch (err) {
            return { status: false, error: err };
        }
    }

    // =====================================================================================================
    /**************
     *
     *
     * Get Today Time
     */

    public static async getTodayTime() {
        const start = new Date();
        start.setHours(0, 0, 0, 0);

        const end = new Date();
        end.setHours(23, 59, 59, 999);

        return { start, end };
    }

    // =====================================================================================================
    /**************
     *
     *
     * Subtract Days
     */

    public static async subtractDays(days: number) {
        return new Date(new Date().setDate(new Date().getDate() - days));
    }

    // =====================================================================================================

    /******
     *
     *
     *
     * Validate Image Upload
     */

    public static async validateUploadedFile({
        file: theFile,
        maxSize = 2000000, // 2 Mega bytes
        allowedMimeTypes = ["image/jpeg", "image/png", "image/jpg"],
    }: {
        file: UploadedFile | UploadedFile[];
        maxSize?: number;
        allowedMimeTypes?: string[];
    }): Promise<any> {
        const file = theFile as UploadedFile;
        if (file.size > maxSize) {
            return {
                error: "File upload error. Please ensure the file size is not more than 2MB.",
                success: false,
            };
        }

        const fileType = file.mimetype;
        if (!allowedMimeTypes.includes(fileType)) {
            return {
                error: `Invalid file type selected. Please select an image/jpeg file.`,
                success: false,
            };
        }

        return {
            data: file,
            success: true,
        };
    }
}

export default UtilFunctions;

// =====================================================================================================

export function throwIfUndefined<T>(x: T | undefined, name?: string): T {
    if (x === undefined) {
        throw new Error(`${name} must not be undefined`);
    }
    return x;
}

// =====================================================================================================

export function throwIfAdminUserUndefined<T>(
    x: T | undefined,
    name?: string
): T {
    if (x === undefined) {
        throw new Error(`This is an admin user. ${name} must not be undefined`);
    }

    return x;
}

// =====================================================================================================

export const generateTXRef = () => {
    const prefix = "KEBLE_TX_REF";
    const key = prefix + UtilFunctions.generateRef("12");
    return key.toUpperCase();
};

// =====================================================================================================

export const generateTXHash = () => {
    const prefix = "KEBLE_TX_HASH_REF";
    const key = prefix + UtilFunctions.generateRef("12");
    return key.toUpperCase();
};

// =====================================================================================================

export const slugify = (text: string) => {
    const text_new = text
        .toLowerCase()
        .replace(/ /g, "-")
        .replace(/[^\w-]+/g, "");
    return text_new;
};

// =====================================================================================================

export const countUniqueItems = (e: any) => {
    return new Set(e).size;
};

// =====================================================================================================

export const getUniqueItems = (e: any) => {
    return new Set(e);
};

// =====================================================================================================

export const convertDate = (date: any) => {
    return new Date(date).toISOString();
};

// =====================================================================================================

export const getPercent = (number: number) => {
    return number / 100;
};

// =====================================================================================================

export const formatDecimal = (number: number, places: number) => {
    const result = Math.floor(Number(number) * places) / places;
    return result;
};

// =====================================================================================================

export const getMonthsDate = (startDate: any, stopDate: any) => {
    const dateStart = moment(startDate);
    const dateEnd = moment(stopDate);
    const interim = dateStart.clone();
    const timeValues = [];

    while (dateEnd > interim || interim.format("M") === dateEnd.format("M")) {
        timeValues.push(interim.format("YYYY-MM"));
        interim.add(1, "month");
    }
    return timeValues;
};

// =====================================================================================================

export const getDaysDate = (startDate: any, stopDate: any) => {
    const dateArray = [];
    let currentDate = moment(startDate);
    stopDate = moment(stopDate);
    while (currentDate <= stopDate) {
        dateArray.push(moment(currentDate).format("YYYY-MM-DD"));
        currentDate = moment(currentDate).add(1, "days");
    }
    return dateArray;
};

export const generateInvitation = () => {
    const invitation_token = crypto.randomBytes(20).toString("hex");
    const invitation_expires = Date.now() + 3600000;

    return { invitation_token, invitation_expires };
};

// =====================================================================================================

export const serverErrorNotification = async (
    req: ExpressRequest,
    error: any,
    auth: IUser | any | null
): Promise<any> => {
    // Server Error Discord Notification
    const discordMessage = `
  First Name:- ${auth?.first_name! || "N/A"},
  Last Name:- ${auth?.last_name! || "N/A"},
  Email:- ${auth?.email! || "N/A"},
  path:- ${req.originalUrl}
  Error:- ${error}
`;
    await DiscordTaskJob({
        name: "Server Error",
        data: {
            title: `Server Error | ${process.env.NODE_ENV} environment `,
            message: discordMessage,
            channel_link: env.isDev
                ? GENERAL_ERROR_DISCORD_CHANNEL_DEVELOPMENT
                : GENERAL_ERROR_DISCORD_CHANNEL_PRODUCTION,
        },
    });

    await discordMessageHelper(
        req,
        auth,
        "Server Error ❌",
        GENERAL_ERROR_DISCORD_CHANNEL_DEVELOPMENT,
        GENERAL_ERROR_DISCORD_CHANNEL_PRODUCTION,
        "Server Error",
        error
    );
    // Audit
    await auditRepository.create({
        req,
        title: "Server Error",
        name: `${auth.first_name} ${auth.last_name}`,
        activity_type: IAuditActivityType.ACCESS,
        activity_status: IAuditActivityStatus.FAILURE,
        user: auth._id,
        data: error,
    });
    return true;
};

export const areDatesInSameMonthAndYear = (
    date1: Date,
    date2: Date
): boolean => {
    return (
        date1.getMonth() === date2.getMonth() &&
        date1.getFullYear() === date2.getFullYear()
    );
};

// =====================================================================================================

export const exportCsv = (
    req: ExpressRequest,
    res: ExpressResponse,
    data: any,
    filename: string
) => {
    const e = Date.now();
    const json2csv = new Parser();
    const csv = json2csv.parse(data);
    const file = path.resolve(
        __dirname,
        `../../files/csv/${filename}_${e}.csv`
    );

    fs.writeFileSync(file, csv, { encoding: "utf-8" });

    const file_path = `${req.protocol}://${req.get(
        "host"
    )}/files/csv/${filename}_${e}.csv`;

    return file_path;
};

// =====================================================================================================

export const export2Csv = (
    res: ExpressResponse,
    data: any,
    filename: string,
    fields?: string[]
) => {
    const json2csv = new Parser({ fields });
    const csv = json2csv.parse(data);

    res.header("Content-Type", "text/csv");
    res.setHeader(
        "Content-Disposition",
        `attachment; filename=${filename}.csv`
    );
    res.send(csv);
};

// =====================================================================================================

// compare_name_likeliness is a function which takes two strings (name1 and name2) and returns the number of changes that need to be made in order to make them the same
export const compare_name_likeliness = (name1: string, name2: string) => {
    // trim whitespace on either side of the string
    // also convert both strings into lowercase
    name1 = name1.trim().toLowerCase();
    name2 = name2.trim().toLowerCase();

    // create an empty matrix
    const matrix = [];

    // loop through the length of name2 and assign each index
    // to a new array within the matrix array with its index
    for (let i = 0; i <= name2.length; i++) {
        matrix[i] = [i];

        // continue to the next iteration if i is equal to 0
        if (i === 0) continue;

        // loop through the length of name1 and assign each index
        // to a new array within the existing arrays of the matrix
        // with its index
        for (let j = 0; j <= name1.length; j++) {
            matrix[0][j] = j;

            // continue to the next iteration if j is equal to 0
            if (j === 0) continue;

            // if the character at the corresponding indices of both strings are the same, cost is 0
            // otherwise, it is 1
            const cost = name2.charAt(i - 1) === name1.charAt(j - 1) ? 0 : 1;

            // calculate the minimum number of changes to make both strings the same
            matrix[i][j] = Math.min(
                matrix[i - 1][j] + 1,
                matrix[i][j - 1] + 1,
                matrix[i - 1][j - 1] + cost
            );
        }
    }

    const distance = matrix[name2.length][name1.length];

    const maxLength = Math.max(name1.length, name2.length);
    const percentage = ((maxLength - distance) / maxLength) * 100;

    return percentage.toFixed(2);
};

// =====================================================================================================

// This function gets an authorized user from the request parameter
export async function getAuthorizedUser(req: ExpressRequest): Promise<any> {
    // Throw error if user is undefined
    const auth = throwIfUndefined(req.user, "req.user");
    // Get user by id
    const user = await userRepository.getById({ _id: auth._id });
    // Check if user provided exists in the system
    if (!user) {
        return {
            success: false,
            message: "User not found",
        };
    }

    // Return the user
    return userRepository.getById({ _id: auth._id });
}

// =====================================================================================================

// This function checks if the credit card is expired or not
export async function check_card_expiry(exp_month: any, exp_year: any) {
    // Get the current date
    const today = new Date();

    // Create a date object with the card's expiry month and year
    const expiry = new Date(exp_year, exp_month);
    // If the card has already expired
    if (expiry < today) {
        // return false
        return false;
    }
    // Otherwise, return true
    return true;
}

export function IsoDate(date: Date) {
    return new Date(
        date.getTime() - date.getTimezoneOffset() * 60000
    ).toISOString();
}

// export function generateFingerprint(req: ExpressRequest) {
//   return new Promise((resolve, reject) => {
//     const options = {
//       preprocessor: (key: any, value: any) => {
//         if (key === 'userAgent') {
//           const userAgent = value.replace(/\(\d+;\s[^;]+;\s[^)]+\)/g, ''); // Remove browser version numbers
//           return userAgent;
//         }
//         return value;
//       },
//     };

//     const fingerprintOptions = {
//       excludes: {
//         pixelRatio: true,
//         doNotTrack: true,
//       },
//     };

//     Fingerprint2.get(options, (components) => {
//       const values = components.map((component) => component.value);
//       const fingerprint = Fingerprint2.x64hash128(values.join(''), 31);
//       resolve(fingerprint);
//     });
//   });
// }

// =====================================================================================================

// export async function computeFlutterwaveCharges(amount: number) {
//   let charge;

//   if (amount <= 250) {
//     charge = 0.5;
//   }else if(amount)
// }

// =====================================================================================================

export function link() {
    let prod_env: any = env.isProd;
    let url: any = {};
    if (!prod_env) {
        url = urls.dev_user;
    } else {
        url = urls.prod_user;
    }
    return url;
}

// =====================================================================================================

export function format_query_decimal(variable: any, decimal_place: number) {
    return {
        $toDouble: {
            $divide: [
                { $trunc: { $multiply: [variable, decimal_place] } },
                decimal_place,
            ],
        },
    };
}

// =====================================================================================================

export const pdfSetup = async (req: ExpressRequest, data: any, name: any) => {
    const sourcePath = `../views/pdfs/${name}.html`;
    if (!fs.existsSync(path.join(__dirname, sourcePath))) {
        fs.writeFileSync(path.join(__dirname, sourcePath), "");
    }

    const documentPath = `./files/pdfs/${name}-${Date.now()}.pdf`;
    const html = fs.readFileSync(path.join(__dirname, sourcePath), "utf8");

    const options = {
        // format: 'A4',
        // orientation: 'portrait',
        margins: {
            top: 0,
            right: 0,
            bottom: 0,
            left: 0,
        },
        // border: '0',
        height: "150mm",
        width: "200mm",
    };

    const document = {
        html: html,
        data: data,
        path: documentPath,
        type: "",
    };

    const file = await pdf.create(document, options, {
        childProcessOptions: {
            env: {
                OPENSSL_CONF: "/dev/null",
            },
        },
    });

    const filename = file.filename
        .replace(
            path.resolve(__dirname, "../../"),
            env.isDev ? "https://staging.keble.co" : "https://keble.co"
            // `${req.protocol}://${req.get("host")}`
        )
        .replace(/\\/g, "/");

    return filename;
};

// =====================================================================================================

export function rate(currency: string) {
    let rate: any = {};
    if (currency === ICurrency.USD) {
        rate = usd_rate;
    } else if (currency === ICurrency.NGN) {
        rate = ngn_rate;
    }

    return rate;
}

// =====================================================================================================

export const image = async (res: ExpressResponse, image_file: any) => {
    const validateFileResult = await UtilFunctions.validateUploadedFile({
        file: image_file,
    });

    if (!validateFileResult.success) {
        return ResponseHandler.sendErrorResponse({
            code: HTTP_CODES.BAD_REQUEST,
            error: validateFileResult.error as string,
            res,
        });
    }

    const uploadImage = await ImageService.uploadImageToS3(
        `project-image-${UtilFunctions.generateRandomString(7)}`,
        image_file,
        image_file.mimetype
    );

    return uploadImage;
};

// =====================================================================================================

export const repoPagination = ({
    page,
    perpage,
    total,
}: {
    page: number;
    perpage: number;
    total: number;
}) => {
    return {
        hasPrevious: page > 1,
        prevPage: page - 1,
        hasNext: page < Math.ceil(total / perpage),
        next: page + 1,
        currentPage: Number(page),
        total: total,
        pageSize: perpage,
        lastPage: Math.ceil(total / perpage),
    };
};

// =====================================================================================================

export const repoSearch = ({
    search,
    searchArray,
}: {
    search: string;
    searchArray: Array<string>;
}) => {
    let searchQuery;
    if (search !== "undefined" && Object.keys(search).length > 0) {
        searchQuery = {
            $or: searchArray.map((item: string) => {
                return {
                    [item]: new RegExp(search, "i"),
                };
            }),
        };
    }

    return searchQuery;
};

// =====================================================================================================

export const repoTime = async ({
    period,
    dateFrom,
    dateTo,
}: {
    period: string;
    dateFrom: string | any;
    dateTo: string | any;
}) => {
    const myDateFrom = convertDate(dateFrom);
    const myDateTo = convertDate(dateTo);
    let timeFilter;
    const { start, end } = await UtilFunctions.getTodayTime(); // Get the start and end times for today
    const current_date = new Date(); // Get the current date

    if (
        period === "all" ||
        period === "custom" ||
        period === "undefined" ||
        period === ""
    ) {
        timeFilter = {
            createdAt: { $gte: new Date(myDateFrom), $lte: new Date(myDateTo) },
        };
    } else if (period === "today") {
        timeFilter = { createdAt: { $gte: start, $lte: end } };
    } else {
        const days = await UtilFunctions.subtractDays(
            Number(period.replace("days", ""))
        );
        timeFilter = {
            createdAt: { $gte: new Date(days), $lte: new Date(current_date) },
        };
    }

    return timeFilter;
};

export const repoPaymentChannel = ({ channel }: { channel: string }) => {
    let search_query = {};
    switch (channel) {
        case "all":
            break;
        case IPaymentGateway.WALLET:
            search_query = {
                ...search_query,
                "transaction.payment_gateway": IPaymentGateway.WALLET,
            };
            break;
        case IPaymentGateway.PAYSTACK:
            search_query = {
                ...search_query,
                "transaction.payment_gateway": IPaymentGateway.PAYSTACK,
            };
            break;
        case IPaymentGateway.FLUTTERWAVE:
            search_query = {
                ...search_query,
                "transaction.payment_gateway": IPaymentGateway.FLUTTERWAVE,
            };
            break;
        case IPaymentGateway.KEBLE:
            search_query = {
                ...search_query,
                "transaction.payment_gateway": IPaymentGateway.KEBLE,
            };
            break;
        case IPaymentGateway.FLUTTERWAVE_APPLEPAY:
            search_query = {
                "transaction.payment_gateway":
                    IPaymentGateway.FLUTTERWAVE_APPLEPAY,
            };
            break;
        default:
            break;
    }

    return search_query;
};

// =====================================================================================================

export const repoTransactionTypeCategory = ({
    category,
}: {
    category: string;
}) => {
    if (category === "all") return {};

    let search_query = {
        "transaction.transaction_type": category,
    };

    return search_query;
};
// =====================================================================================================

export const repoTransactionChannels = ({ channel }: { channel: string }) => {
    let search_query = {};

    switch (channel) {
        case IPaymentGateway.WALLET:
            search_query = {
                ...search_query,
                payment_gateway: IPaymentGateway.WALLET,
            };
            break;
        case IPaymentGateway.PAYSTACK:
            search_query = {
                ...search_query,
                payment_gateway: IPaymentGateway.PAYSTACK,
            };
            break;
        case IPaymentGateway.FLUTTERWAVE:
            search_query = {
                ...search_query,
                payment_gateway: IPaymentGateway.FLUTTERWAVE,
            };
            break;
        case IPaymentGateway.KEBLE:
            search_query = {
                ...search_query,
                payment_gateway: IPaymentGateway.KEBLE,
            };
            break;
        case IPaymentGateway.FLUTTERWAVE_APPLEPAY:
            search_query = {
                ...search_query,
                payment_gateway: IPaymentGateway.FLUTTERWAVE_APPLEPAY,
            };
            break;
        default:
            break;
    }

    return search_query;
};

export const repoTransactionPaymentMethod = ({
    payment_method,
}: {
    payment_method: string;
}) => {
    let search_query = {};
    switch (payment_method) {
        case "all":
            break;
        case ITransactionMedium.WALLET:
            search_query = {
                ...search_query,
                transaction_medium: ITransactionMedium.WALLET,
            };
            break;
        case ITransactionMedium.CARD:
            search_query = {
                ...search_query,
                transaction_medium: ITransactionMedium.CARD,
            };
            break;
        case ITransactionMedium.BANK:
            search_query = {
                ...search_query,
                transaction_medium: ITransactionMedium.BANK,
            };
            break;
        case ITransactionMedium.DIRECT_DEBIT:
            search_query = {
                ...search_query,
                transaction_medium: ITransactionMedium.DIRECT_DEBIT,
            };
            break;
        default:
            break;
    }

    return search_query;
};

// =====================================================================================================

export const repoPaymentMethod = ({
    payment_method,
}: {
    payment_method: string;
}) => {
    let search_query = {};
    switch (payment_method) {
        case "all":
            break;
        case ITransactionMedium.WALLET:
            search_query = {
                ...search_query,
                "transaction.transaction_medium": ITransactionMedium.WALLET,
            };
            break;
        case ITransactionMedium.CARD:
            search_query = {
                ...search_query,
                "transaction.transaction_medium": ITransactionMedium.CARD,
            };
            break;
        case ITransactionMedium.BANK:
            search_query = {
                ...search_query,
                "transaction.transaction_medium": ITransactionMedium.BANK,
            };
            break;
        case ITransactionMedium.DIRECT_DEBIT:
            search_query = {
                ...search_query,
                "transaction.transaction_medium":
                    ITransactionMedium.DIRECT_DEBIT,
            };
            break;
        default:
            break;
    }

    return search_query;
};
// =====================================================================================================

export const repoTransactionPaymentChannel = ({
    channel,
}: {
    channel: string;
}) => {
    let search_query = {};
    switch (channel) {
        case "all":
            break;
        case IPaymentGateway.WALLET:
            search_query = {
                ...search_query,
                payment_gateway: IPaymentGateway.WALLET,
            };
            break;
        case IPaymentGateway.PAYSTACK:
            search_query = {
                ...search_query,
                payment_gateway: IPaymentGateway.PAYSTACK,
            };
            break;
        case IPaymentGateway.FLUTTERWAVE:
            search_query = {
                ...search_query,
                payment_gateway: IPaymentGateway.FLUTTERWAVE,
            };
            break;
        case IPaymentGateway.KEBLE:
            search_query = {
                ...search_query,
                payment_gateway: IPaymentGateway.KEBLE,
            };
            break;
        default:
            break;
    }

    return search_query;
};

// =====================================================================================================

export const repoTransactionCategory = ({
    transaction_category,
}: {
    transaction_category: string;
}) => {
    let search_query = {};
    switch (transaction_category) {
        case "all":
            break;
        case IKebleTransactionType.INTER_TRANSFER:
            search_query = {
                ...search_query,
                keble_transaction_type: IKebleTransactionType.INTER_TRANSFER,
            };
            break;
        case IKebleTransactionType.BANK_TRANSFER:
            search_query = {
                ...search_query,
                keble_transaction_type: IKebleTransactionType.BANK_TRANSFER,
            };
            break;
        case IKebleTransactionType.INVESTMENT:
            search_query = {
                ...search_query,
                keble_transaction_type: IKebleTransactionType.INVESTMENT,
            };
            break;
        case IKebleTransactionType.WALLET_DEBIT:
            search_query = {
                ...search_query,
                keble_transaction_type: IKebleTransactionType.WALLET_DEBIT,
            };
            break;
        case IKebleTransactionType.WALLET_FUNDING:
            search_query = {
                ...search_query,
                keble_transaction_type: IKebleTransactionType.WALLET_FUNDING,
            };
            break;
        case IKebleTransactionType.REFERRAL:
            search_query = {
                ...search_query,
                keble_transaction_type: IKebleTransactionType.REFERRAL,
            };
            break;
        default:
            break;
    }

    return search_query;
};

// =====================================================================================================

export const repoTransactCategory = ({
    transaction_category,
}: {
    transaction_category: string;
}) => {
    let search_query = {};
    switch (transaction_category) {
        case "all":
            break;
        case IKebleTransactionType.INTER_TRANSFER:
            search_query = {
                ...search_query,
                "transaction.keble_transaction_type":
                    IKebleTransactionType.INTER_TRANSFER,
            };
            break;
        case IKebleTransactionType.BANK_TRANSFER:
            search_query = {
                ...search_query,
                "transaction.keble_transaction_type":
                    IKebleTransactionType.BANK_TRANSFER,
            };
            break;
        case IKebleTransactionType.INVESTMENT:
            search_query = {
                ...search_query,
                "transaction.keble_transaction_type":
                    IKebleTransactionType.INVESTMENT,
            };
            break;
        case IKebleTransactionType.WALLET_DEBIT:
            search_query = {
                ...search_query,
                "transaction.keble_transaction_type":
                    IKebleTransactionType.WALLET_DEBIT,
            };
            break;
        case IKebleTransactionType.WALLET_FUNDING:
            search_query = {
                ...search_query,
                "transaction.keble_transaction_type":
                    IKebleTransactionType.WALLET_FUNDING,
            };
            break;
        case IKebleTransactionType.REFERRAL:
            search_query = {
                ...search_query,
                "transaction.keble_transaction_type":
                    IKebleTransactionType.REFERRAL,
            };
            break;
        default:
            break;
    }

    return search_query;
};

// =====================================================================================================

export const repoPlanType = ({ plan_type }: { plan_type: string }) => {
    let search_query = {};
    switch (plan_type) {
        case IPortfolioOccurrence.All:
            break;
        case IPortfolioOccurrence.RECURRING:
            search_query = {
                ...search_query,
                plan_occurrence: IPortfolioOccurrence.RECURRING,
            };
            break;
        case IPortfolioOccurrence.ONE_TIME_PAYMENT:
            search_query = {
                ...search_query,
                plan_occurrence: IPortfolioOccurrence.ONE_TIME_PAYMENT,
            };
            break;
        default:
            break;
    }

    return search_query;
};

// =====================================================================================================

export const repoInvestmentCategory = ({
    investment_category,
}: {
    investment_category: string;
}) => {
    let search_query = {};
    switch (investment_category) {
        case "all":
            break;
        case IInvestmentCategory.FIXED:
            search_query = {
                ...search_query,
                investment_category: IInvestmentCategory.FIXED,
            };
            break;
        case IInvestmentCategory.FLEXIBLE:
            search_query = {
                ...search_query,
                investment_type: IInvestmentCategory.FLEXIBLE,
            };
            break;
        default:
            break;
    }

    return search_query;
};

// =====================================================================================================

export const repoReinvest = ({ reinvest }: { reinvest: string }) => {
    let search_query = {};
    switch (reinvest) {
        case "all":
            break;
        case IReinvest.ONLY_RETURNS:
            search_query = {
                ...search_query,
                reinvest: IReinvest.ONLY_RETURNS,
            };
            break;
        case IReinvest.ONLY_AMOUNT:
            search_query = {
                ...search_query,
                reinvest: IReinvest.ONLY_AMOUNT,
            };
            break;
        default:
            break;
    }

    return search_query;
};

// =====================================================================================================

export const repoInvestmentType = ({
    investment_type,
}: {
    investment_type: string;
}) => {
    let search_query = {};
    switch (investment_type) {
        case "all":
            break;
        case IInvestmentType.FIXED:
            search_query = {
                ...search_query,
                investment_type: IInvestmentType.FIXED,
            };
            break;
        case IInvestmentType.REITS:
            search_query = {
                ...search_query,
                investment_type: IInvestmentType.REITS,
            };
            break;
        case IInvestmentType.ETFS:
            search_query = {
                ...search_query,
                investment_type: IInvestmentType.ETFS,
            };
            break;
        default:
            break;
    }

    return search_query;
};

// =====================================================================================================

export const repoExportPlanFixedPipeline = ({
    filterQuery,
}: {
    filterQuery: {};
}) => {
    // create the plan query pipeline
    const plan_pipeline = [
        {
            $match: filterQuery,
        },

        {
            $sort: {
                createdAt: -1,
            },
        },

        {
            $lookup: {
                from: "listings",
                localField: "listing_id",
                foreignField: "_id",
                as: "listing",
            },
        },

        { $unwind: { path: "$listing", preserveNullAndEmptyArrays: true } },
        {
            $lookup: {
                from: "plans",
                localField: "plan",
                foreignField: "_id",
                as: "plan",
            },
        },

        { $unwind: { path: "$plan", preserveNullAndEmptyArrays: true } },
        {
            $sort: {
                createdAt: -1,
            },
        },

        {
            $project: {
                _id: 1,
                plan_name: "$plan.plan_name",
                name_of_asset: "$listing.project_name",
                amount_invested: format_query_decimal("$amount", 100),
                current_returns: {
                    $cond: {
                        if: {
                            $and: [
                                { $eq: ["$listing._id", "$listing_id"] },
                                {
                                    $eq: [
                                        "$investment_status",
                                        IInvestmentStatus.INVESTMENT_MATURED,
                                    ],
                                },
                            ],
                        },
                        then: format_query_decimal(
                            {
                                $multiply: [
                                    "$amount",
                                    { $divide: ["$listing.returns", 100] },
                                ],
                            },
                            1000
                        ),

                        else: format_query_decimal(
                            {
                                $multiply: [
                                    {
                                        $divide: [
                                            // Current Date
                                            {
                                                $subtract: [
                                                    "$$NOW",
                                                    "$start_date",
                                                ],
                                            },

                                            // Completed Date
                                            {
                                                $subtract: [
                                                    "$end_date",
                                                    "$start_date",
                                                ],
                                            },
                                        ],
                                    },
                                    {
                                        $multiply: [
                                            "$amount",
                                            {
                                                $divide: [
                                                    "$listing.returns",
                                                    100,
                                                ],
                                            },
                                        ],
                                    },
                                ],
                            },
                            1000
                        ),
                    },
                },

                current_value: format_query_decimal(
                    {
                        $add: [
                            "$amount",
                            {
                                $cond: {
                                    if: {
                                        $and: [
                                            {
                                                $eq: [
                                                    "$listing._id",
                                                    "$listing_id",
                                                ],
                                            },
                                            {
                                                $eq: [
                                                    "$investment_status",
                                                    IInvestmentStatus.INVESTMENT_MATURED,
                                                ],
                                            },
                                        ],
                                    },
                                    then: format_query_decimal(
                                        {
                                            $multiply: [
                                                "$amount",
                                                {
                                                    $divide: [
                                                        "$listing.returns",
                                                        100,
                                                    ],
                                                },
                                            ],
                                        },
                                        1000
                                    ),

                                    else: format_query_decimal(
                                        {
                                            $multiply: [
                                                {
                                                    $divide: [
                                                        // Current Date
                                                        {
                                                            $subtract: [
                                                                "$$NOW",
                                                                "$start_date",
                                                            ],
                                                        },

                                                        // Completed Date
                                                        {
                                                            $subtract: [
                                                                "$end_date",
                                                                "$start_date",
                                                            ],
                                                        },
                                                    ],
                                                },
                                                {
                                                    $multiply: [
                                                        "$amount",
                                                        {
                                                            $divide: [
                                                                "$listing.returns",
                                                                100,
                                                            ],
                                                        },
                                                    ],
                                                },
                                            ],
                                        },
                                        1000
                                    ),
                                },
                            },
                        ],
                    },
                    100
                ),

                expected_payout: format_query_decimal(
                    {
                        $add: [
                            "$amount",
                            {
                                $multiply: [
                                    "$amount",
                                    { $divide: ["$listing.returns", 100] },
                                ],
                            },
                        ],
                    },
                    100
                ),

                start_date: {
                    $dateToString: {
                        format: "%Y-%m-%d", // Format string based on your requirements
                        date: "$start_date", // Replace 'dateField' with your actual field name containing the date
                    },
                },
                start_time: {
                    $dateToString: {
                        format: "%H:%M:%S", // Format string based on your requirements
                        date: "$start_date", // Replace 'dateField' with your actual field name containing the date
                    },
                },
                maturity_date: {
                    $dateToString: {
                        format: "%Y-%m-%d", // Format string based on your requirements
                        date: "$end_date", // Replace 'dateField' with your actual field name containing the date
                    },
                },
                maturity_time: {
                    $dateToString: {
                        format: "%H:%M:%S", // Format string based on your requirements
                        date: "$end_date", // Replace 'dateField' with your actual field name containing the date
                    },
                },

                currency: "$investment_currency",
                createdAt: 1,
            },
        },
    ];

    return plan_pipeline;
};
