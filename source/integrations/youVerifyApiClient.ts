import axios from 'axios';
import {
  YOU_VERIFY_TEST_API_KEY,
  YOU_VERIFY_LIVE_API_KEY,
  YOU_VERIFY_TEST_URL,
  YOU_VERIFY_LIVE_URL,
  env,
} from '../config/env.config';

export const youVerifyApiClient = {
  client: async () => {
    const app = axios.create({
      baseURL: YOU_VERIFY_LIVE_URL,
      headers: {
        token: YOU_VERIFY_LIVE_API_KEY,
        'Content-Type': 'application/json',
      },
    });
    return app;
  },

  // NIN Verification
  ninVerification: async ({ id, isSubjectConsent }: { id: string; isSubjectConsent: boolean }) => {
    try {
      const apiCall = await youVerifyApiClient.client();
      const res = await apiCall.post(`/v2/api/identity/ng/nin`, {
        id,
        isSubjectConsent,
      });

      if (res?.data?.Data) return res.data.Data;
      return res?.data;
    } catch (e: any | Error | unknown) {
      if (e?.response) {
        return {
          success: false,
          message: e?.response?.data,
        };
      }
    }
  },

  // PASSPORT Verification
  passportVerification: async ({
    id,
    isSubjectConsent,
    lastName,
  }: {
    id: string;
    lastName: string;
    isSubjectConsent: boolean;
  }) => {
    try {
      const apiCall = await youVerifyApiClient.client();
      const res = await apiCall.post(`/v2/api/identity/ng/passport`, {
        id,
        lastName,
        isSubjectConsent,
      });

      if (res?.data?.Data) return res.data.Data;
      return res?.data;
    } catch (e: any | Error | unknown) {
      if (e?.response) {
        return {
          success: false,
          message: e?.response?.data,
        };
      }
    }
  },

  // DRIVER's LICENSE Verification
  driverLicenseVerification: async ({
    id,
    isSubjectConsent,
  }: {
    id: string;
    isSubjectConsent: boolean;
  }) => {
    try {
      const apiCall = await youVerifyApiClient.client();
      const res = await apiCall.post(`/v2/api/identity/ng/drivers-license`, {
        id,
        isSubjectConsent,
      });

      if (res?.data?.Data) return res.data.Data;
      return res?.data;
    } catch (e: any | Error | unknown) {
      if (e?.response) {
        return {
          success: false,
          message: e?.response?.data,
        };
      }
    }
  },

  // BVN Verification
  bvnVerification: async ({ id, isSubjectConsent }: { id: string; isSubjectConsent: boolean }) => {
    try {
      const apiCall = await youVerifyApiClient.client();
      const res = await apiCall.post(`/v2/api/identity/ng/bvn`, {
        id,
        isSubjectConsent,
      });

      if (res?.data?.Data) return res.data.Data;
      return res?.data;
    } catch (e: any | Error | unknown) {
      if (e?.response) {
        return {
          success: false,
          message: e?.response?.data,
        };
      }
    }
  },
};
