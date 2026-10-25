import { OP_STATES, STATUSES } from './constants';
import { runTx, req } from './db';

/** A row is trusted only if every field the sync depends on is present and valid. */
export function isValidOperationRow(row) {
  return Boolean(
    row
      && typeof row.opId === 'string' && row.opId.length > 0
      && typeof row.seq === 'number' && Number.isFinite(row.seq)
      && typeof row.key === 'string'
      && Number.isInteger(row.classId) && Number.isInteger(row.studentId)
      && typeof row.date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(row.date)
      && STATUSES.includes(row.status)
      && OP_STATES.includes(row.state)
      && (row.baseVersion === null || (Number.isInteger(row.baseVersion) && row.baseVersion >= 0)),
  );
}

export function summarizeOutbox(rows) {
  const counts = { pending: 0, inflight: 0, conflict: 0, rejected: 0, corrupt: 0, total: rows.length };

  rows.forEach((row) => {
    if (!isValidOperationRow(row)) counts.corrupt += 1;
    else counts[row.state] += 1;
  });

  return counts;
}

/**
 * The single rule behind "no new session while earlier changes are unconfirmed".
 * Anything in the queue blocks, whatever its state, and an unreadable row blocks too (fail closed).
 */
export function evaluateGate(rows) {
  const counts = summarizeOutbox(rows);

  if (counts.corrupt > 0) {
    return { ok: false, reason: 'storage_corrupt', counts, message: 'Some saved changes on this device could not be read, so a new session is blocked to protect your data.' };
  }
  if (counts.conflict > 0) {
    return { ok: false, reason: 'conflict', counts, message: `${counts.conflict} change(s) conflict with the server. Resolve them first.` };
  }
  if (counts.rejected > 0) {
    return { ok: false, reason: 'rejected', counts, message: `${counts.rejected} change(s) were rejected by the server. Review them first.` };
  }
  if (counts.inflight > 0) {
    return { ok: false, reason: 'inflight', counts, message: `${counts.inflight} change(s) are waiting for the server to confirm.` };
  }
  if (counts.pending > 0) {
    return { ok: false, reason: 'pending', counts, message: `${counts.pending} change(s) are not synced yet. Connect and sync first.` };
  }

  return { ok: true, reason: null, counts, message: '' };
}

export const STORAGE_BLOCK = {
  ok: false,
  reason: 'storage_unreadable',
  counts: null,
  message: 'Local storage cannot be read, so a new session is blocked to protect your data.',
};

/** Reads the durable queue and applies the gate. Used for display; opening a session re-checks atomically. */
export async function checkGate() {
  try {
    const rows = await runTx(['outbox'], 'readonly', ({ outbox }) => req(outbox.getAll()));
    return evaluateGate(rows);
  } catch {
    return STORAGE_BLOCK;
  }
}
