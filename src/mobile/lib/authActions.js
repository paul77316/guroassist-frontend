import mobileApi from './mobileApi';
import { clearSession, defaultDeviceName, getDeviceUuid, saveSession } from './mobileAuth';
import { checkGate } from './gate';
import { deleteAccountDb } from './db';

/** Returns { state: 'signed_in', user } or { state: 'pending' }. Errors carry a code the screen can explain. */
export async function login({ email, password }) {
  const response = await mobileApi.post('/login', {
    email,
    password,
    device_uuid: getDeviceUuid(),
    device_name: defaultDeviceName(),
  });

  if (response.status === 202) return { state: 'pending' };

  const { token, expires_at: expiresAt, user } = response.data;
  saveSession({ token, expiresAt, user: { id: user.id, name: user.name, email: user.email } });

  return { state: 'signed_in', user };
}

/**
 * Signs out. Unsynced work is never deleted: local data stays on the phone for the next sign-in.
 * With `wipe`, the data is erased too, but only when nothing is waiting for the server.
 */
export async function logout({ userId, wipe = false } = {}) {
  if (wipe) {
    const gate = await checkGate();
    if (!gate.ok) throw new Error('Some changes are not confirmed by the server yet, so the data cannot be cleared.');
  }

  try { await mobileApi.post('/logout'); } catch { /* offline or already expired: the token is dropped below */ }
  clearSession();

  if (wipe && userId) await deleteAccountDb(userId);
}
