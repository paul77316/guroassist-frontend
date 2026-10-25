import mobileApi from './mobileApi';
import { runTx, req } from './db';
import { applyConfirmed, applyServerWins, getOutboxRows } from './attendanceStore';
import { withSyncLock } from './lock';
import { isValidOperationRow } from './gate';

const BATCH_LIMIT = 100;
const MAX_ROUNDS = 50;

let state = { syncing: false, lastStatus: null, lastError: null, lastRunAt: null };
const listeners = new Set();

export const getSyncState = () => state;

export function subscribeSync(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function setState(patch) {
  state = { ...state, ...patch };
  listeners.forEach((l) => l(state));
}

const toWire = (op) => ({
  operation_id: op.opId,
  class_assignment_id: op.classId,
  student_id: op.studentId,
  date: op.date,
  status: op.status,
  remarks: op.remarks ?? null,
  base_version: op.baseVersion,
});

/**
 * Picks the next operations and marks them in flight in ONE transaction. Because it re-reads the queue
 * inside that transaction, a mark made a moment earlier cannot be sent in its old form and then deleted
 * by the acknowledgement. At most one operation per student goes out at a time, so each one is sent with
 * the version the previous one produced.
 */
async function claimBatch() {
  return runTx(['outbox'], 'readwrite', async ({ outbox }) => {
    const rows = (await req(outbox.getAll())).sort((a, b) => a.seq - b.seq);
    const blocked = new Set();
    const seen = new Set();
    const batch = [];

    for (const row of rows) {
      if (!isValidOperationRow(row)) continue;
      if (row.state === 'conflict' || row.state === 'rejected') { blocked.add(row.key); continue; }
      if (blocked.has(row.key) || seen.has(row.key)) continue;
      seen.add(row.key);
      if (row.baseVersion === null) continue;
      if (batch.length < BATCH_LIMIT) batch.push(row);
    }

    const claimed = batch.map((row) => ({ ...row, state: 'inflight' }));
    claimed.forEach((row) => outbox.put(row));

    return claimed;
  });
}

async function applyResults(batch, results) {
  const byId = new Map(results.map((r) => [r.operation_id, r]));
  let confirmed = 0;

  await runTx(['outbox', 'records', 'cache'], 'readwrite', async (stores) => {
    for (const op of batch) {
      const res = byId.get(op.opId);
      if (!res) continue; // no answer for it: it stays queued and in flight

      if (res.outcome === 'applied') {
        await applyConfirmed(stores, op, res.version);
        confirmed += 1;
      } else if (res.outcome === 'discarded') {
        await applyServerWins(stores, op, res.server);
        confirmed += 1;
      } else if (res.outcome === 'conflict') {
        stores.outbox.put({ ...op, state: 'conflict', server: res.server ?? null, reason: res.reason ?? 'stale_version' });
      } else if (res.outcome === 'rejected') {
        stores.outbox.put({ ...op, state: 'rejected', reason: res.reason ?? 'rejected' });
      }
    }
  });

  return confirmed;
}

async function rejectBatch(batch, reason) {
  await runTx(['outbox'], 'readwrite', ({ outbox }) => {
    batch.forEach((op) => outbox.put({ ...op, state: 'rejected', reason }));
  });
}

function transportStatus(error) {
  if (error?.status === 401) return 'auth_expired';
  if (error?.status === 403) return 'device_blocked';
  if (error?.status === 429) return 'throttled';
  if (error?.status === null || error?.status === undefined) return 'offline';
  return 'server_error';
}

async function runSync() {
  for (let round = 0; round < MAX_ROUNDS; round += 1) {
    const batch = await claimBatch();
    if (batch.length === 0) return { status: round === 0 ? 'idle' : 'ok' };

    let results;
    try {
      const { data } = await mobileApi.post('/attendance/sync', { operations: batch.map(toWire) });
      results = data.data ?? [];
    } catch (error) {
      // Whatever happened, the operations stay in the queue, still marked in flight: the outcome is unknown
      // and the next attempt resends the same operation ids, which the server answers from its receipts.
      if (error?.status === 422) {
        await rejectBatch(batch, 'invalid_request');
        return { status: 'rejected', error };
      }
      return { status: transportStatus(error), error };
    }

    const confirmed = await applyResults(batch, results);
    if (confirmed === 0) return { status: 'attention' };
  }

  return { status: 'ok' };
}

/** Sends everything the server has not confirmed. Safe to call from anywhere, any time, in any tab. */
export async function syncNow() {
  if (state.syncing) return { status: 'skipped' };

  setState({ syncing: true });
  let result;

  try {
    result = await withSyncLock(runSync);
  } catch (error) {
    result = { status: 'storage_error', error };
  }

  setState({
    syncing: false,
    lastStatus: result?.status ?? 'idle',
    lastError: result?.error?.message ?? null,
    lastRunAt: Date.now(),
  });

  return result;
}

/** Asks the server to settle one conflict. Needs a connection and the right to resolve it. */
export async function resolveConflict(opId, resolution) {
  const rows = await getOutboxRows();
  const op = rows.find((o) => o.opId === opId && o.state === 'conflict');
  if (!op) throw new Error('This conflict is no longer in the queue.');

  const { data } = await mobileApi.post(`/attendance/sync/${opId}/resolve`, { resolution });
  const result = data.data;

  await runTx(['outbox', 'records', 'cache'], 'readwrite', async (stores) => {
    if (result.outcome === 'applied') await applyConfirmed(stores, op, result.version);
    else await applyServerWins(stores, op, result.server);
  });

  return result;
}
