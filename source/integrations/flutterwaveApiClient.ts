import axios from "axios";
import {
    FLUTTERWAVE_SECRET_KEY,
    FLUTTERWAVE_BASE_API_URI,
} from "../config/env.config";

export const flutterwaveApiClient = {
    client: async () => {
        const app = axios.create({
            baseURL: FLUTTERWAVE_BASE_API_URI,
            headers: {
                Authorization: `Bearer ${FLUTTERWAVE_SECRET_KEY}`,
            },
        });

        return app;
    },

    recurringCharge: async (body: {
        token: string;
        tx_ref: string;
        email: string;
        amount: number;
        currency: string;
        redirect_url?: string;
        meta?: Record<string, any>;
        do_3ds?: boolean;
    }) => {
        try {
            const apiCall = await flutterwaveApiClient.client();
            const res = await apiCall.post(`/tokenized-charges`, {
                ...body,
            });

            if (res?.data?.Data) return res.data.Data;
            return res?.data;
        } catch (e: any | Error | unknown) {
            console.log(e.response);
            if (e?.response) return Promise.reject(e?.response);
            return Promise.reject(e);
        }
    },

    applePay: async (body: {
        tx_ref: string;
        email: string;
        amount: number;
        fullname: string;
        currency: string;
        redirect_url?: string;
        meta?: Record<string, any>;
    }) => {
        try {
            const apiCall = await flutterwaveApiClient.client();
            const res = await apiCall.post(`/charges?type=applepay`, {
                ...body,
            });

            if (res?.data?.Data) return res.data.Data;
            return res?.data;
        } catch (e: any | Error | unknown) {
            console.log(e.response);
            if (e?.response) return Promise.reject(e?.response);
            return Promise.reject(e);
        }
    },

    initializeTransaction: async (body: {
        tx_ref: string;
        email: string;
        amount: number;
        customer?: Record<string, any>;
        customizations?: Record<string, any>;
    }) => {
        try {
            const apiCall = await flutterwaveApiClient.client();
            const res = await apiCall.post(`/payments`, {
                ...body,
            });

            if (res?.data?.Data) return res.data.Data;

            return res?.data;
        } catch (e: any | Error | unknown) {
            return Promise.reject(e);
        }
    },

    verifyTransaction: async (id: string) => {
        try {
            const apiCall = await flutterwaveApiClient.client();
            const res = await apiCall.get(`/transactions/${id}/verify`);

            if (res?.data) return res.data;
            return res?.data;
        } catch (e: any | Error | unknown) {
            if (e?.response?.data)
                return Promise.reject(String(e?.response?.data?.ErrorMessage));
            return Promise.reject(e);
        }
    },
};
