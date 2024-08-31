import axios from "axios";
import {
    ANCHOR_LIVE_API_URI,
    ANCHOR_TEST_API_URI,
    ANCHOR_SECRET_TEST_KEY,
    env,
} from "../config";

export const anchorApiClient = {
    client: async () => {
        const app = axios.create({
            baseURL: env.isProd ? ANCHOR_LIVE_API_URI : ANCHOR_TEST_API_URI,
            headers: {
                accept: "application/json",
                "content-type": "application/json",
                "x-anchor-key": ANCHOR_SECRET_TEST_KEY,
            },
        });

        return app;
    },

    create_customer: async ({
        firstName,
        lastName,
        middleName,
        email,
        phoneNumber,
        addressLine_1,
        city,
        state,
        postalCode,
        country,
        dateOfBirth,
        gender,
        bvn,
    }: {
        firstName: string;
        lastName: string;
        middleName?: string;
        email: string;
        phoneNumber: string;
        addressLine_1?: string;
        city?: string;
        state?: string;
        postalCode?: string;
        country?: string;
        dateOfBirth: string;
        gender: string;
        bvn: string;
    }) => {
        try {
            const apiCall = await anchorApiClient.client();
            const res = await apiCall.post(`/api/v1/customers/`, {
                data: {
                    type: "IndividualCustomer",
                    attributes: {
                        fullName: {
                            firstName,
                            lastName,
                            middleName,
                        },
                        email,
                        phoneNumber,
                        address: {
                            addressLine_1,
                            city,
                            state,
                            postalCode,
                            country,
                        },
                        identificationLevel2: {
                            dateOfBirth,
                            gender,
                            bvn,
                        },
                    },
                },
            });

            if (res?.data?.Data) return res.data;

            return res?.data;
        } catch (e: any) {
            return {
                error: e.response.data.errors,
            };
        }
    },

    customer_kyc_validation: async ({
        customer_id,
        bvn,
        dob,
        gender,
    }: {
        customer_id: string;
        bvn: string;
        dob: string;
        gender: string;
    }) => {
        try {
            const apiCall = await anchorApiClient.client();
            const res = await apiCall.post(
                `/api/v1/customers/${customer_id}/verification/individual`,
                {
                    data: {
                        type: "Verification",
                        attributes: {
                            level: "TIER_2",
                            level2: {
                                bvn,
                                dateOfBirth: dob,
                                gender,
                            },
                        },
                    },
                }
            );

            console.log(
                ".............................................",
                res.data
            );
            if (res?.data?.Data) return res.data;

            return res?.data;
        } catch (e: any) {
            console.log(
                "!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!",
                e.response
            );
            return Promise.reject(e);
        }
    },

    create_deposit_account: async ({
        customer_id,
        account_name,
        account_number,
        bank_code,
    }: {
        customer_id: string;
        account_name: string;
        account_number: string;
        bank_code: string;
    }) => {
        try {
            const apiCall = await anchorApiClient.client();
            const res = await apiCall.post(`/api/v1/customers//accounts`, {
                data: {
                    type: "DepositAccount",
                    attributes: {
                        accountName: account_name,
                        accountNumber: account_number,
                        bankCode: bank_code,
                    },
                },
            });

            if (res?.data?.Data) return res.data;

            return res?.data;
        } catch (e: any) {
            return Promise.reject(e);
        }
    },

    generate_account: async ({
        firstName,
        lastName,
        reference,
        email,
        bvn,
    }: {
        firstName: string;
        lastName: string;
        reference?: string;
        email: string;
        bvn: string;
    }) => {
        try {
            const apiCall = await anchorApiClient.client();
            const res = await apiCall.post(`/api/v1/virtual-nubans`, {
                data: {
                    type: "VirtualNuban",
                    attributes: {
                        virtualAccountDetail: {
                            name: `${firstName} ${lastName}`,
                            bvn: bvn,
                            reference: reference,
                            email: email,
                            description: "string",
                            permanent: false,
                        },
                        provider: "providus",
                    },
                    relationships: {
                        settlementAccount: {
                            data: {
                                id: "16916802330941-anc_acc",
                                type: "DepositAccount",
                            },
                        },
                    },
                },
            });

            console.log(">>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>", res.data);

            if (res?.data?.Data) return res.data;

            return res?.data;
        } catch (e: any) {
            console.log(
                "????????????????????????????????????????",
                e.response.data.errors
            );
            return {
                error: e.response.data.errors,
            };
        }
    },

    delete_customer: async ({ customer_id }: { customer_id: string }) => {
        try {
            const apiCall = await anchorApiClient.client();
            const res = await apiCall.delete(
                `/api/v1/customers/${customer_id}`
            );

            if (res?.data?.Data) return res.data.Data;

            return res?.data;
        } catch (e: any) {
            return Promise.reject(e);
        }
    },
};
