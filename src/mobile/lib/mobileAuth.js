const SESSION_KEY = 'guroassist.mobile.session';
const DEVICE_KEY = 'guroassist.mobile.device';

export function newId() {
  if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID();
  const hex = () => Math.floor(Math.random() * 16).toString(16);
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => (c === 'x' ? hex() : ((Math.random() * 4) | 8).toString(16)));
}

/** Stable id for this phone, generated once. The admin approves this id. */
export function getDeviceUuid() {
  let id = localStorage.getItem(DEVICE_KEY);
  if (!id) {
    id = newId();
    localStorage.setItem(DEVICE_KEY, id);
  }
  return id;
}

export function defaultDeviceName() {
  const ua = navigator.userAgent ?? '';
  if (/android/i.test(ua)) return 'Android phone';
  if (/iphone|ipad/i.test(ua)) return 'iPhone or iPad';
  return 'Mobile device';
}

export function getSession() {
  try {
    return JSON.parse(localStorage.getItem(SESSION_KEY) ?? 'null');
  } catch {
    return null;
  }
}

export function saveSession({ token, expiresAt, user }) {
  localStorage.setItem(SESSION_KEY, JSON.stringify({ token, expiresAt, user }));
}

/** Drops the token but remembers who was signed in, so their local data stays theirs. */
export function expireSession() {
  const current = getSession();
  if (current) saveSession({ ...current, token: null });
}

export function clearSession() {
  localStorage.removeItem(SESSION_KEY);
}

export function hasLiveToken() {
  const session = getSession();
  if (!session?.token) return false;
  return !session.expiresAt || new Date(session.expiresAt).getTime() > Date.now();
}
