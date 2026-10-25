import axios from 'axios';
import { getSession, expireSession } from './mobileAuth';
import { getApiOrigin } from '../../services/apiOrigin';

/**
 * The mobile app talks only to /api/mobile with a bearer token. It sends no cookies on purpose:
 * a web session cookie would be authenticated first by the server and refused on these routes.
 */
const mobileApi = axios.create({
  baseURL: `${getApiOrigin()}/api/mobile`,
  adapter: 'fetch',
  withCredentials: false,
  timeout: 15000,
  headers: { Accept: 'application/json' },
});

mobileApi.interceptors.request.use((config) => {
  const token = getSession()?.token;
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

mobileApi.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response) {
      const { status, data } = error.response;
      if (status === 401) {
        expireSession();
        window.dispatchEvent(new CustomEvent('mobile:unauthenticated'));
      }
      if (status === 403 && ['device_not_approved', 'device_revoked'].includes(data?.code)) {
        window.dispatchEvent(new CustomEvent('mobile:device-blocked', { detail: { code: data.code } }));
      }
      return Promise.reject({
        status,
        code: data?.code ?? null,
        message: data?.message ?? 'Something went wrong.',
        errors: data?.errors ?? null,
        data,
      });
    }

    return Promise.reject({ status: null, code: error.code ?? null, message: 'No connection to the server.', errors: null });
  },
);

export default mobileApi;
