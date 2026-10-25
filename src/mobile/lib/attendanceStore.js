import { STATUSES, SessionChangedError, StudentBlockedError } from './constants';
import { runTx, req } from './db';
import { newId } from './mobileAuth';

export const recordKey = (classId, date, studentId) => `${classId}|${date}|${studentId}`;
export const rosterKey = (classId, date) => `roster|${classId}|${date}`;
export const latestRosterKey = (classId) => `rosterLatest|${classId}`;
export const layoutKey = (classId) => `layout|${classId}`;

const bySeq = (a, b) => (a.seq ?? 0) - (b.seq ?? 0);

export async function getCurrentSession() {
  const row = await runTx(['meta'], 'readonly', ({ meta }) => req(meta.get('current')));
  return row?.value ?? null;
}

export async function cacheGet(k) {
  const row = await runTx(['cache'], 'readonly', ({ cache }) => req(cache.get(k)));
  return row?.value ?? null;
}

export async function cachePutMany(entries) {
  await runTx(['cache'], 'readwrite', ({ cache }) => {
    entries.forEach(([k, value]) => cache.put({ k, value, savedAt: Date.now() }));
  });
}

export async function getOutboxRows() {
  const rows = await runTx(['outbox'], 'readonly', ({ outbox }) => req(outbox.getAll()));
  return rows.sort(bySeq);
}

/**
 * Records a mark. The local record and its outbox operation commit in ONE transaction, and this
 * function resolves only after that commit, so the screen can show "saved on this device" safely.
 * It also refuses if another tab has switched to a different session.
 */
export async function markAttendance({ classId, date, studentId, status, remarks = null }) {
  if (!STATUSES.includes(status)) throw new Error('Unknown attendance status.');

  const key = recordKey(classId, date, studentId);

  return runTx(['records', 'outbox', 'meta', 'cache'], 'readwrite', async ({ records, outbox, meta, cache }) => {
    const current = (await req(meta.get('current')))?.value;
    if (!current || current.classId !== classId || current.date !== date) throw new SessionChangedError();

    const record = await req(records.get(key));
    const roster = (await req(cache.get(rosterKey(classId, date))))?.value;
    const rosterBase = roster?.students?.find((s) => s.student_id === studentId)?.version ?? 0;
    const baseVersion = record ? record.baseVersion : rosterBase;

    const ops = (await req(outbox.getAll())).filter((o) => o.key === key).sort(bySeq);
    const last = ops[ops.length - 1];

    if (last && (last.state === 'conflict' || last.state === 'rejected')) throw new StudentBlockedError(last.state);

    if (last && last.state === 'pending') {
      outbox.put({ ...last, status, remarks });
    } else {
      const seqRow = await req(meta.get('seq'));
      const seq = (seqRow?.value ?? 0) + 1;
      meta.put({ k: 'seq', value: seq });
      outbox.put({
        opId: newId(),
        seq,
        key,
        classId,
        date,
        studentId,
        status,
        remarks,
        // A change queued behind an unconfirmed one learns its base version from that one's receipt.
        baseVersion: last ? null : baseVersion,
        state: 'pending',
        createdAt: Date.now(),
      });
    }

    const saved = { key, classId, date, studentId, status, remarks, baseVersion };
    records.put(saved);

    return saved;
  });
}

/** Shared by sync and conflict resolution: the server confirmed `op` at `version`. */
export async function applyConfirmed({ outbox, records, cache }, op, version) {
  outbox.delete(op.opId);

  const rows = await req(outbox.getAll());
  rows
    .filter((o) => o.key === op.key && o.seq > op.seq && o.baseVersion === null)
    .forEach((o) => outbox.put({ ...o, baseVersion: version }));

  const record = await req(records.get(op.key));
  if (record) records.put({ ...record, baseVersion: version });

  await patchRosterCache(cache, op.classId, op.date, op.studentId, op.status, version);
}

/** The admin or server value wins: show it and forget the device's own mark. */
export async function applyServerWins({ outbox, records, cache }, op, server) {
  outbox.delete(op.opId);

  const rows = await req(outbox.getAll());
  rows
    .filter((o) => o.key === op.key && o.seq > op.seq && o.baseVersion === null)
    .forEach((o) => outbox.put({ ...o, baseVersion: server?.version ?? 0 }));

  if (server?.status) {
    records.put({ key: op.key, classId: op.classId, date: op.date, studentId: op.studentId, status: server.status, remarks: server.remarks ?? null, baseVersion: server.version });
  } else {
    records.delete(op.key);
  }

  await patchRosterCache(cache, op.classId, op.date, op.studentId, server?.status ?? null, server?.version ?? 0);
}

async function patchRosterCache(cache, classId, date, studentId, status, version) {
  const entry = await req(cache.get(rosterKey(classId, date)));
  if (!entry?.value?.students) return;

  const students = entry.value.students.map((s) => (s.student_id === studentId ? { ...s, status, version } : s));
  cache.put({ ...entry, value: { ...entry.value, students } });
}

/** User chose to drop a change the server permanently rejected. The device returns to the cached server state. */
export async function discardOperation(opId) {
  return runTx(['outbox', 'records', 'cache'], 'readwrite', async (stores) => {
    const op = await req(stores.outbox.get(opId));
    if (!op) return null;

    const roster = (await req(stores.cache.get(rosterKey(op.classId, op.date))))?.value;
    const server = roster?.students?.find((s) => s.student_id === op.studentId);
    await applyServerWins(stores, op, { status: server?.status ?? null, version: server?.version ?? 0 });

    return op;
  });
}

/** Everything the session screen needs, read from the durable store only. */
export async function readSessionView(classId, date) {
  const { records, outbox, cache } = await runTx(['records', 'outbox', 'cache'], 'readonly', async (s) => ({
    records: await req(s.records.getAll()),
    outbox: await req(s.outbox.getAll()),
    cache: {
      roster: (await req(s.cache.get(rosterKey(classId, date))))?.value ?? null,
      latest: (await req(s.cache.get(latestRosterKey(classId))))?.value ?? null,
      layout: (await req(s.cache.get(layoutKey(classId))))?.value ?? null,
    },
  }));

  const exact = cache.roster;
  const roster = exact ?? cache.latest;
  const unverified = !exact;
  const local = new Map(records.filter((r) => r.classId === classId && r.date === date).map((r) => [r.studentId, r]));
  const ops = new Map();
  outbox.filter((o) => o.classId === classId && o.date === date).sort(bySeq).forEach((o) => ops.set(o.studentId, o));

  const students = (roster?.students ?? []).map((s) => {
    const record = local.get(s.student_id);
    const op = ops.get(s.student_id);

    return {
      studentId: s.student_id,
      name: s.full_name,
      status: record ? record.status : (unverified ? null : s.status),
      syncState: op?.state ?? null,
      opId: op?.opId ?? null,
      server: op?.server ?? null,
      reason: op?.reason ?? null,
    };
  });

  return { classId, date, unverified, hasRoster: Boolean(roster), students, layout: cache.layout };
}
