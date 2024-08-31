import axios from 'axios';
import { FINCRA_BASE_API_URl, FINCRA_SECRET_KEY } from '../config';

export const fincraApiClient = {
  client: async () => {
    const app = axios.create({
      baseURL: FINCRA_BASE_API_URl,
      headers: {
        accept: 'application/json',
        'content-type': 'application/json',
        'api-key': FINCRA_SECRET_KEY,
      },
    });

    return app;
  },

  resolve_account_number: async () => {
    try {
      const apiCall = await fincraApiClient.client();
      const res = await apiCall.post(`/accounts/resolve`, {
        // accountNumber: '0690588682',
        // bankCode: '044',
        type: 'iban',
        iban: '4EV733840820',
      });
      console.log(res);
      if (res?.data?.Data) return res.data.Data;

      return res?.data;
    } catch (e: any | Error | unknown) {
      console.log(e);
      return Promise.reject(e);
    }
  },

  list_banks: async () => {
    try {
      const apiCall = await fincraApiClient.client();
      const res = await apiCall.get(`/banks?currency=NGN&country=NG`);
      console.log(res);
      if (res?.data?.Data) return res.data.Data;

      return res?.data;
    } catch (e: any | Error | unknown) {
      console.log(e);
      return Promise.reject(e);
    }
  },

  get_conversion_rate: async () => {
    try {
    const apiCall = await fincraApiClient.client();
    const params = {
      base: 'NGN',
      symbols: 'USD',
    };
    const res = await apiCall.get(`profile/merchants/me`,
    // {
    //   params,
    // }
    );
      console.log("res>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>", res);
      // if (res?.data?.Data) return res.data.Data;

      // return res?.data;
    } catch (e: any | Error | unknown) {
      console.log(e);
      return Promise.reject(e);
    }
  }
};
