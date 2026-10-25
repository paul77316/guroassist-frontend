import { StorageError } from './constants';

const DB_VERSION = 1;
let handle = null;

export const dbNameFor = (userId) => `guroassist-mobile-u${userId}`;

/**
 * One database per signed-in account, so two teachers on one phone never see each other's data.
 * Stores: records (local marks), outbox (operations the server has not confirmed),
 * cache (roster, layout and class list downloaded for offline use), meta (current session, counters).
 */
function upgrade(db, oldVersion) {
  if (oldVersion < 1) {
    db.createObjectStore('records', { keyPath: 'key' });
    db.createObjectStore('outbox', { keyPath: 'opId' });
    db.createObjectStore('cache', { keyPath: 'k' });
    db.createObjectStore('meta', { keyPath: 'k' });
  }
}

export function openAccountDb(userId) {
  closeAccountDb();

  return new Promise((resolve, reject) => {
    if (!globalThis.indexedDB) {
      reject(new StorageError('This browser has no IndexedDB.'));
      return;
    }

    let request;
    try {
      request = globalThis.indexedDB.open(dbNameFor(userId), DB_VERSION);
    } catch (e) {
      reject(new StorageError('Could not open local storage.', e));
      return;
    }

    request.onupgradeneeded = (event) => upgrade(request.result, event.oldVersion);
    request.onblocked = () => reject(new StorageError('Local storage is blocked by another tab.'));
    request.onerror = () => reject(new StorageError('Could not open local storage.', request.error));
    request.onsuccess = () => {
      handle = request.result;
      handle.onversionchange = () => closeAccountDb();
      handle.onclose = () => { handle = null; };
      resolve(handle);
    };
  });
}

export function closeAccountDb() {
  if (handle) {
    handle.close();
    handle = null;
  }
}

export function isDbOpen() {
  return handle !== null;
}

export function deleteAccountDb(userId) {
  closeAccountDb();

  return new Promise((resolve, reject) => {
    const request = globalThis.indexedDB.deleteDatabase(dbNameFor(userId));
    request.onsuccess = () => resolve();
    request.onerror = () => reject(new StorageError('Could not clear local data.', request.error));
    request.onblocked = () => reject(new StorageError('Close other tabs, then try again.'));
  });
}

/** Wraps an IDBRequest so it can be awaited inside a transaction. */
export const req = (request) =>
  new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });

/**
 * Runs `work` inside one IndexedDB transaction. Resolves only after the transaction has committed,
 * so callers can treat "resolved" as "durably saved". If `work` throws, the transaction is aborted and
 * nothing is written.
 */
export function runTx(storeNames, mode, work) {
  return new Promise((resolve, reject) => {
    if (!handle) {
      reject(new StorageError('Local storage is not available.'));
      return;
    }

    let tx;
    try {
      tx = handle.transaction(storeNames, mode);
    } catch (e) {
      reject(new StorageError('Local storage is not available.', e));
      return;
    }

    let result;
    let settled = false;
    const fail = (error) => {
      if (settled) return;
      settled = true;
      reject(error);
    };

    tx.oncomplete = () => {
      if (settled) return;
      settled = true;
      resolve(result);
    };
    tx.onabort = () => fail(tx.error ? new StorageError('A local save failed.', tx.error) : new StorageError('A local save was cancelled.'));
    tx.onerror = () => fail(new StorageError('A local save failed.', tx.error));

    const stores = Object.fromEntries(storeNames.map((name) => [name, tx.objectStore(name)]));

    Promise.resolve()
      .then(() => work(stores, tx))
      .then(
        (value) => { result = value; },
        (error) => {
          fail(error);
          try { tx.abort(); } catch { /* already finished */ }
        },
      );
  });
}
