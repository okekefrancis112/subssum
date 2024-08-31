import { env } from "../config/env.config";

export const APP_CONSTANTS = {
    GENERAL: {
        SALT_ROUNDS: 10,
        LIKELINESS_THRESHOLD: 0.67,
    },
    REDIRECTS: {
        WALLET: env.isDev
            ? "https://staging.keble.co/wallet"
            : "https://keble.co/wallet",
        ACCOUNT: env.isDev
            ? "https://staging.keble.co/account"
            : "https://keble.co/account",
        INVESTMENT: env.isDev
            ? "https://staging.keble.co/invest"
            : "https://keble.co/invest",
    },

    EXPORTS: {
        CSV: "csv",
        PDF: "pdf",
    },

    LIMITS: {
        MAXIMUM_WALLET_CREDIT_INCOMPLETE_KYC: 100,
        MAXIMUM_INVESTMENT_INCOMPLETE_KYC: 100,
    },

    OTP: {
        TTL_DEFAULT: 15,
        TTL_SECURITY: 5,
    },

    TOKEN_TYPE: {
        WITHDRAWAL: "withdrawal",
        TRANSFER: "transfer",
    },
};

export const HTTP_CODES = {
    OK: 200,
    CREATED: 201,
    NO_CONTENT: 204,
    BAD_REQUEST: 400,
    UNAUTHORIZED: 401,
    FORBIDDEN: 403,
    NOT_FOUND: 404,
    CONFLICT: 409,
    INTERNAL_SERVER_ERROR: 500,
};

export const usd_rate = {
    real: 15,
    stock: 11,
    saving: 5,
};

export const ngn_rate = {
    real: 30,
    stock: 20,
    saving: 12,
};

export const urls = {
    dev_user: "https://staging.keble.co",
    prod_user: "https://keble.co",
};

export const ADMIN_INVITATION = "https://admin.keble.co";

export const USER_REGISTRATION_DISCORD_CHANNEL_DEVELOPMENT =
    "https://discord.com/api/webhooks/1071696799431151627/30hyjGsd-iAEVSCupt9M_nHAXjicK5StUjhUgfB5wtD6Du8-qon8CIBIAOHS6I5UHlzX";

export const WALLET_GENERATION_DISCORD_CHANNEL_DEVELOPMENT =
    "https://discord.com/api/webhooks/1071698113900838972/lzZdwMoxmdd75hkKMsJCfKYTfuA5KRE3Xu5GLS6Kb7bfsHp17gtae7R1dnbyAFjNKIzQ";

export const BANK_CARD_LINK_DISCORD_CHANNEL_DEVELOPMENT =
    "https://discord.com/api/webhooks/1071834370886881360/YcTvwajqT7HIXVALF-xsXDNmgpi9SSjSQ17xjADbbUwAITbXytSAFBmaoU2h8W9amuvg";

export const CARD_LINK_DISCORD_CHANNEL_DEVELOPMENT =
    "https://discord.com/api/webhooks/1096707799909662841/kKNDu2XLOFOnDnEWZC-vLrCduMGKc_rf8yCeQtTkLu8RjwEsP9u8rF_cbwxWdvbCFz0k";

export const PLAN_DISCORD_CHANNEL_DEVELOPMENT =
    "https://discord.com/api/webhooks/1071844111285489674/PWtQ8Hzgs5ZQ2IUUVZait5M3ArGaJqx_8Owwi8S7I6Hcjgrhun5AXUi061y4HRH3V-cp";

export const GENERAL_ERROR_DISCORD_CHANNEL_DEVELOPMENT =
    "https://discord.com/api/webhooks/1071853195711750297/p18VLbuXdzW3tnPHlwV2ciCIJtESIhvtnMxsP4sF5SAHxGtBx8ai30_nr1EzLdfuwlil";

export const WITHDRAWAL_REQUESTS_DISCORD_DEVELOPMENT =
    "https://discord.com/api/webhooks/1111530725204840498/GSo9NV6NgYx0GTdyWPmzhe0CQAKoradBN5jvNL3zF9cimv_UOrqz3CGOdbhl_r6RAW-w";

export const KYC_DISCORD_CHANNEL_DEVELOPMENT =
    "https://discord.com/api/webhooks/1143585926715551814/xFALJoyLv12EpZ3wOyQ7dTJ-8gBTnNt7OWNfc1La4PYLrCamKx1V8yA3_vEIKOTZ0CB0";

// PRODUCTION

export const USER_REGISTRATION_DISCORD_CHANNEL_PRODUCTION =
    "https://discord.com/api/webhooks/1138335937173143552/7OWlwT_dVisHeUEN4RHWo5c_hfwWfloRH0WyiFwrdBAorhmTvNONpi3v4b0gEIg_p4hr";

export const WALLET_GENERATION_DISCORD_CHANNEL_PRODUCTION =
    "https://discord.com/api/webhooks/1138340769086836836/RrjZrhCrm9pVSZsTnYlGqCqdwtQ_1rrtWSFeU-inqGB_yswOpTjCrx7l6xpgp2ZTQ7fY";

export const PLAN_DISCORD_CHANNEL_PRODUCTION =
    "https://discord.com/api/webhooks/1138341318930735235/h4WJf6VPsuYSt3Bue5DWTPDK_3NVgb3mupA5DEu1UpqAnrlCUStK_ifh_vYH0PPr6VqR";

export const WITHDRAWAL_REQUESTS_DISCORD_PRODUCTION =
    "https://discord.com/api/webhooks/1138341727749550161/-n8i3kUyQ8cISnmP_gIUAIe81sEmiEi3V6uYOX_ZkDNGqh6JKgyNOpliICOjHfoMVyNe";

export const GENERAL_ERROR_DISCORD_CHANNEL_PRODUCTION =
    "https://discord.com/api/webhooks/1138342128389460098/pmP4xESnFslQifhIi32TLuSGo_8l9eqQ6tlJpt-XJ3vw47XPPpPZ4WC_sYhOm1XwGgL0";

export const KYC_DISCORD_CHANNEL_PRODUCTION =
    "https://discord.com/api/webhooks/1143575561814417499/7WtDMRza4rg8bUxtx163UCJbN9IFA5vSubeoCSO89I1hM7SfmXcgRuy6n1jsKpkTRChk";

export const BANK_CARD_LINK_DISCORD_CHANNEL_PRODUCTION =
    "https://discord.com/api/webhooks/1144159888273068064/jK7PS038Eu02lqddv0exYODU_IyOqRu6wpvbOTIlwEPszupcwfdbRXwKPjty7tWj6YT_";

// ========================================================================================================

export const DISCORD_INVESTMENT_SUCCESS_DEVELOPMENT =
    "https://discord.com/api/webhooks/1144497334395355236/mUWGkgFOAk7crxl3gNG82omkISGhhaA527yl5_ve6tvWbr-sYxNzaJIHCLSn2jscZP6T";

export const DISCORD_INVESTMENT_SUCCESS_PRODUCTION =
    "https://discord.com/api/webhooks/1144498519584018453/BW4CIWPLtoQsT1Ib3mBmVplYsLFDyDxAWo-fiEC5hoGKecJ6YPrFF5xajHRFXiJrSzW6";

export const DISCORD_INVESTMENT_ERROR_DEVELOPMENT =
    "https://discord.com/api/webhooks/1144499208917880902/3qHMJyGPhIl7SRvks_I44pYqd1q29V-8wN9HM-8SCF9Ll81pvbBEXbjz21fBfU9lKDgN";

export const DISCORD_INVESTMENT_ERROR_PRODUCTION =
    "https://discord.com/api/webhooks/1144499875011108947/J4ExxIKc3U5xMiLBdIVIHJGW76HCKo3Rb1fERaOM7tmCUQN9Q78Ue78t3CGSO0XoCMsV";

export const DISCORD_INVESTMENT_INITIATED_DEVELOPMENT =
    "https://discord.com/api/webhooks/1144500644481343549/KYH-hVm0yImS5LD58E3Umvc0Q06Ko6l34xm_VAl-SvRFUzo-BqDaazdPSR5DWvgt89bf";

export const DISCORD_INVESTMENT_INITIATED_PRODUCTION =
    "https://discord.com/api/webhooks/1144501409912467506/Er2Or5cmpokhGp3NJ6c3SjmupHwa-fOle_40I1ahrzcAJgzM5idY4anBAWtGxWM7asj3";

export const DISCORD_SUCCESS_WALLET_FUNDING_DEVELOPMENT =
    "https://discord.com/api/webhooks/1144528458786029578/tFUcbM-XNs37IYgciJne0jdlKz9sEpzpJvPdfR2UamX5zXbhm5OLw0dqOIkBpiq6Uw6l";

export const DISCORD_SUCCESS_WALLET_FUNDING_PRODUCTION =
    "https://discord.com/api/webhooks/1144529546100605018/2esA5jeX2D6Ak5umqAb5w9eGxB5-A3kfm8ee63a_bcSuSAOBKz7I_JnEVnmazptSnInL";

export const DISCORD_ERROR_WALLET_FUNDING_DEVELOPMENT =
    "https://discord.com/api/webhooks/1144531129001582734/TJHgQW7vXXoN-9EpXyDNJ8F4UqUbIp81DD_wEPQlMR3NFqoyb3hTnx7-fFezc84M3hi5";

export const DISCORD_ERROR_WALLET_FUNDING_PRODUCTION =
    "https://discord.com/api/webhooks/1144532727664742410/4phyq3KcS8xrqXmDO-H9j0lvz1oF0NR52XVm4AfkNfzjTZfrO8FPViF2WVZVJ22Ru0_H";

export const DISCORD_WALLET_INITIATED_FUNDING_DEVELOPMENT =
    "https://discord.com/api/webhooks/1144533531859628032/iZiX4Gi0Bl_NbaIQ48pLY5u8-lKjR1p6Oqk6rbJUsbLpzpyrT3yTn9d9LH-oijlZ5Z8n";

export const DISCORD_WALLET_INITIATED_FUNDING_PRODUCTION =
    "https://discord.com/api/webhooks/1144534270447190099/WlcJxvb1_dGAHqpPSGxC94XOH4338Ji42fphIjST4peC2pTR9VJlqMGUDTzrCxDCaBYs";

export const DISCORD_WALLET_TRANSFER_SUCCESS_DEVELOPMENT =
    "https://discord.com/api/webhooks/1144535367320621116/RV6jFQmUpuIBfKepZn3i_cUMtnNqrsUgYzU_BoEYQlRMB5JMRfjoMPXcPsCofg_h416u";

export const DISCORD_WALLET_TRANSFER_SUCCESS_PRODUCTION =
    "https://discord.com/api/webhooks/1144537018651656195/TBgGQGBqwohsiesGFOFUKdM2XihNshO2GnpdLp6cMyaLgH58BlIRUYez6hqNIGIYloqr";

export const DISCORD_WALLET_TRANSFER_ERROR_DEVELOPMENT =
    "https://discord.com/api/webhooks/1144538073888198811/JNY9YEfsIeFVo16cs7RUzZodjIkSTx30ZuEvXuJK8eJg9K4X8xXsFJhVVkeJqIn3uwmy";

export const DISCORD_WALLET_TRANSFER_ERROR_PRODUCTION =
    "https://discord.com/api/webhooks/1144537483577663581/BNrNj-9AGud8tu6F3XeHFpYND3tSzqfv57Lx1mQNcpJHfxOdoEQRsQtND3qrQJAu8b3Q";

export const DISCORD_WALLET_WITHDRAWAL_SUCCESS_DEVELOPMENT =
    "https://discord.com/api/webhooks/1144540227432632440/QURcwQZnyzi_uy1VT2oYoIYd7roe0E2IvNo6Uad7LdZAGnQ1VqWmfhkq6ic-CqE4H_n9";

export const DISCORD_WALLET_WITHDRAWAL_SUCCESS_PRODUCTION =
    "https://discord.com/api/webhooks/1144541867766202490/9EfU0usJ17Aj4egP36iDV1mpk-_mLQtNmLwgkhPes3ZVQHa-Acuo757_Bu2MUmVf0T1U";

export const DISCORD_WALLET_WITHDRAWAL_ERROR_DEVELOPMENT =
    "https://discord.com/api/webhooks/1144542449390342214/0UK7prB84f9JyfRSXuQVuXGlCdoGQta_5K8HfMoiZgsxTmv7v0PPeuo0J6gh11JJ8BGX";

export const DISCORD_WALLET_WITHDRAWAL_ERROR_PRODUCTION =
    "https://discord.com/api/webhooks/1144543018033107046/XU_lZhIsmPKG0lVPqHrwpHkMTmOY6ren3YlseSN_cYuQ4ZXn5E1kwNh1cpON0y5QCXFD";
