import { SYNC_LOCK_NAME } from './constants';

const LEASE_KEY = 'guroassist.mobile.sync-lease';
const LEASE_MS = 30_000;
const OWNER = `${Date.now()}-${Math.random().toString(36).slice(2)}`;

/**
 * Only one tab may sync at a time. Web Locks give a real mutual exclusion; where they are missing a
 * short lease in localStorage is the best available substitute. Either way the server is idempotent,
 * so a rare overlap cannot create duplicates.
 */
export async function withSyncLock(work) {
  if (globalThis.navigator?.locks?.request) {
    return globalThis.navigator.locks.request(
      SYNC_LOCK_NAME,
      { ifAvailable: true },
      (lock) => (lock ? work() : { status: 'skipped' }),
    );
  }

  return withLease(work);
}

async function withLease(work) {
  const storage = globalThis.localStorage;
  const now = Date.now();

  try {
    const held = JSON.parse(storage.getItem(LEASE_KEY) ?? 'null');
    if (held && held.owner !== OWNER && held.expiresAt > now) return { status: 'skipped' };

    storage.setItem(LEASE_KEY, JSON.stringify({ owner: OWNER, expiresAt: now + LEASE_MS }));
    const confirmed = JSON.parse(storage.getItem(LEASE_KEY) ?? 'null');
    if (!confirmed || confirmed.owner !== OWNER) return { status: 'skipped' };
  } catch {
    return { status: 'skipped' };
  }

  try {
    return await work();
  } finally {
    try {
      const held = JSON.parse(storage.getItem(LEASE_KEY) ?? 'null');
      if (held?.owner === OWNER) storage.removeItem(LEASE_KEY);
    } catch { /* storage gone: the lease expires on its own */ }
  }
}
