import { useCallback, useEffect, useState } from 'react';
import { getOutboxRows } from './lib/attendanceStore';
import { summarizeOutbox } from './lib/gate';
import { getSyncState, subscribeSync, syncNow } from './lib/sync';
import { isDbOpen } from './lib/db';

export function useOnline() {
  const [online, setOnline] = useState(navigator.onLine);

  useEffect(() => {
    const up = () => setOnline(true);
    const down = () => setOnline(false);
    window.addEventListener('online', up);
    window.addEventListener('offline', down);
    return () => {
      window.removeEventListener('online', up);
      window.removeEventListener('offline', down);
    };
  }, []);

  return online;
}

export const OUTBOX_CHANGED = 'mobile:outbox-changed';
export const notifyOutboxChanged = () => window.dispatchEvent(new CustomEvent(OUTBOX_CHANGED));

/** The queue summary, re-read from durable storage whenever something may have changed it. */
export function useOutboxSummary() {
  const [summary, setSummary] = useState({ pending: 0, inflight: 0, conflict: 0, rejected: 0, corrupt: 0, total: 0 });
  const [storageOk, setStorageOk] = useState(true);

  const refresh = useCallback(async () => {
    if (!isDbOpen()) { setStorageOk(false); return; }
    try {
      setSummary(summarizeOutbox(await getOutboxRows()));
      setStorageOk(true);
    } catch {
      setStorageOk(false);
    }
  }, []);

  useEffect(() => {
    refresh();
    const id = setInterval(refresh, 5000);
    window.addEventListener(OUTBOX_CHANGED, refresh);
    const off = subscribeSync(refresh);
    return () => {
      clearInterval(id);
      window.removeEventListener(OUTBOX_CHANGED, refresh);
      off();
    };
  }, [refresh]);

  return { summary, storageOk, refresh };
}

export function useSyncState() {
  const [state, setState] = useState(getSyncState());
  useEffect(() => subscribeSync(setState), []);
  return state;
}

/** Retries on reconnect and every 30 seconds while anything is waiting. */
export function useAutoSync(hasWork) {
  useEffect(() => {
    const run = () => { if (hasWork) syncNow(); };
    window.addEventListener('online', run);
    const id = setInterval(run, 30000);
    run();
    return () => {
      window.removeEventListener('online', run);
      clearInterval(id);
    };
  }, [hasWork]);
}

export function todayLocal() {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}
