import axios from 'axios';
import {
  MONO_SECRET_KEY,
  MONO_BASE_API_URl_CONNECT,
  MONO_BASE_API_URl_DIRECT,
} from '../config/env.config';

export const monoApiClient = {
  clientConnect: async () => {
    const app = axios.create({
      baseURL: MONO_BASE_API_URl_CONNECT,
      headers: {
        'Content-Type': 'application/json',
        'mono-sec-key': `${MONO_SECRET_KEY}`,
      },
    });
    return app;
  },

  clientDirect: async () => {
    const app = axios.create({
      baseURL: MONO_BASE_API_URl_DIRECT,
      headers: {
        'Content-Type': 'application/json',
        'mono-sec-key': `${MONO_SECRET_KEY}`,
      },
    });
    return app;
  },
  auth: async (body: { code: string }) => {
    try {
      const apiCall = await monoApiClient.clientConnect();
      const res = await apiCall.post(`account/auth`, {
        ...body,
      });

      if (res?.data) return res.data;

      return res?.data;
    } catch (e: any | Error | unknown) {
      if (e?.message) return Promise.reject(e?.message);
    }
  },

  initializeTransaction: async (body: {
    amount: string;
    type: string;
    description: string;
    reference: string;
    account?: string;
    redirect_url?: string;
    meta?: Record<string, any>;
  }) => {
    try {
      const apiCall = await monoApiClient.clientDirect();
      const res = await apiCall.post(`/payments/initiate`, {
        ...body,
      });

      if (res?.data?.Data) return res.data.Data;

      return res?.data;
    } catch (e: any | Error | unknown) {
      console.log(e);
      return Promise.reject(e);
    }
  },

  verifyTransaction: async (reference: string) => {
    try {
      const apiCall = await monoApiClient.clientDirect();
      const res = await apiCall.post(`/payments/verify`, {
        reference,
      });

      if (res?.data?.data) return res.data.data;
    } catch (e: any | Error | unknown) {
      console.log(e);
      return Promise.reject(e);
    }
  },
};
