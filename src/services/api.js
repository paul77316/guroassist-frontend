import axios from 'axios';
import { getApiOrigin } from './apiOrigin';

// Sanctum's SPA (cookie) auth requires:
//  - withCredentials so the browser sends/receives the session + XSRF cookies
//  - the XSRF-TOKEN cookie value echoed back as the X-XSRF-TOKEN header
//    (axios does this automatically when xsrfCookieName/xsrfHeaderName are set
//    and the request is same-origin or the domain is trusted)
const api = axios.create({
  baseURL: `${getApiOrigin()}/api`,
  withCredentials: true,
  withXSRFToken: true,
  xsrfCookieName: 'XSRF-TOKEN',
  xsrfHeaderName: 'X-XSRF-TOKEN',
  headers: {
    Accept: 'application/json',
  },
});

// Laravel returns 401 for unauthenticated requests and 422 for validation
// errors with a { message, errors } shape. Surface both consistently so
// components don't each re-implement error parsing.
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response) {
      const { status, data } = error.response;
      if (status === 401) {
        // Let AuthContext decide what to do (e.g. redirect to /login)
        window.dispatchEvent(new CustomEvent('auth:unauthenticated'));
      }
      if (status === 403 && ['password_change_required', 'initial_password_expired'].includes(data?.code)) {
        window.dispatchEvent(new CustomEvent('auth:initial-password-required', { detail: { code: data.code } }));
      }
      return Promise.reject({
        status,
        code: data?.code ?? null,
        message: data?.message ?? 'Something went wrong.',
        errors: data?.errors ?? null,
      });
    }
    return Promise.reject({ status: null, message: 'Network error. Please try again.', errors: null });
  }
);

// Must be called once before login/logout so Laravel issues the XSRF cookie.
export async function ensureCsrfCookie() {
  await axios.get(`${getApiOrigin()}/sanctum/csrf-cookie`, { withCredentials: true });
}

export default api;
