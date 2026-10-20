import api, { ensureCsrfCookie } from './api';

export async function login({ email, password }) {
  await ensureCsrfCookie();
  const { data } = await api.post('/auth/login', { email, password });
  return data; // { user: {...} }
}

export async function logout() {
  await api.post('/auth/logout');
}

export async function fetchCurrentUser() {
  const { data } = await api.get('/auth/me');
  return data; // { user: {...} }
}
