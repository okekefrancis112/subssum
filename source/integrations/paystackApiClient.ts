import axios from "axios";
import {
    PAYSTACK_SECRET_KEY,
    PAYSTACK_BASE_API_URl,
} from "../config/env.config";

export const paystackApiClient = {
    client: async () => {
        const app = axios.create({
            baseURL: PAYSTACK_BASE_API_URl,
            headers: {
                Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`,
                "Content-Type": "application/json",
            },
        });
        return app;
    },

    recurringCharge: async (body: {
        authorization_code: string;
        email: string;
        amount: number;
        customerName?: string;
        metadata: Record<string, any>;
    }) => {
        try {
            const apiCall = await paystackApiClient.client();
            const res = await apiCall.post(
                `/transaction/charge_authorization`,
                {
                    ...body,
                }
            );

            if (res?.data?.Data) return res.data.Data;
            return res?.data;
        } catch (e: any | Error | unknown) {
            console.log(e);
            if (e?.response) return Promise.reject(e?.response);
            return Promise.reject(e);
        }
    },

    initializeTransaction: async (body: {
        email: string;
        amount: number;
        callback_url: string;
        metadata?: Record<string, any>;
        customerName?: string;
    }) => {
        try {
            const apiCall = await paystackApiClient.client();
            const res = await apiCall.post(`/transaction/initialize`, {
                ...body,
            });

            if (res?.data?.Data) return res.data.Data;
            return res?.data;
        } catch (e: any | Error | unknown) {
            console.log(e.response);
            return {
                success: false,
                message: e?.response?.data?.message || "An error occurred",
            };
            // return Promise.reject(e);
        }
    },

    verifyTransaction: async (reference: string) => {
        try {
            const apiCall = await paystackApiClient.client();
            const res = await apiCall.get(`/transaction/verify/${reference}`);
            if (res?.data?.Data) return res.data.Data;
            return res?.data;
        } catch (e: any | Error | unknown) {
            if (e?.response?.data)
                return Promise.reject(String(e?.response?.data?.message));
            return Promise.reject(e);
        }
    },

    bank_list: async () => {
        try {
            const apiCall = await paystackApiClient.client();
            const res = await apiCall.get("/bank");

            if (res?.data?.Data) return res.data.Data;

            return res?.data;
        } catch (e: any | Error | unknown) {
            if (e?.response?.data)
                return Promise.reject(String(e?.response?.data?.message));
            return Promise.reject(e);
        }
    },

    resolve_account_number: async (
        account_number: string,
        bank_code: string
    ) => {
        try {
            const apiCall = await paystackApiClient.client();
            const res = await apiCall.get(
                `/bank/resolve?account_number=${account_number}&bank_code=${bank_code}`
            );

            if (res?.data?.Data) return res.data.Data;
            return res?.data;
        } catch (e: any | Error | unknown) {
            if (e?.response?.data)
                return Promise.reject(String(e?.response?.data?.message));
            return Promise.reject(e);
        }
    },
};
