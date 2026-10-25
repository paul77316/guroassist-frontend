import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import mobileApi from '../lib/mobileApi';
import { CLASS_ID, DATE, freshDevice } from './helpers';
import { markAttendance, getOutboxRows, readSessionView } from '../lib/attendanceStore';
import { openSession } from '../lib/sessionManager';
import { resolveConflict, syncNow } from '../lib/sync';
import { checkGate } from '../lib/gate';
import { withSyncLock } from '../lib/lock';

vi.mock('../lib/mobileApi', () => ({ default: { get: vi.fn(), post: vi.fn() } }));

const mark = (studentId, status) => markAttendance({ classId: CLASS_ID, date: DATE, studentId, status });
let ctx;

beforeEach(async () => {
  ctx = await freshDevice();
  await openSession({ classId: CLASS_ID, date: DATE });
});

afterEach(() => vi.restoreAllMocks());

describe('acknowledgements', () => {
  it('removes an operation only after the server confirms it, and clears the gate', async () => {
    await mark(1, 'absent');
    expect((await checkGate()).ok).toBe(false);

    expect((await syncNow()).status).toBe('ok');

    expect(await getOutboxRows()).toHaveLength(0);
    expect(ctx.server.att.get(1)).toEqual({ status: 'absent', version: 1 });
    expect((await checkGate()).ok).toBe(true);
    const view = await readSessionView(CLASS_ID, DATE);
    expect(view.students.find((s) => s.studentId === 1)).toMatchObject({ status: 'absent', syncState: null });
  });

  it('keeps everything when the server is unreachable', async () => {
    ctx.server.mode = 'down';
    await mark(1, 'absent');

    expect((await syncNow()).status).toBe('offline');
    expect(await getOutboxRows()).toHaveLength(1);
    expect((await checkGate()).ok).toBe(false);
  });

  it('treats a commit with a lost answer as unknown, then resends the same id without duplicating', async () => {
    await mark(1, 'absent');
    ctx.server.mode = 'timeout';

    expect((await syncNow()).status).toBe('offline');
    const [stuck] = await getOutboxRows();
    expect(stuck.state).toBe('inflight');
    expect((await checkGate()).reason).toBe('inflight');
    expect(ctx.server.att.get(1).version).toBe(1); // the server did commit

    ctx.server.mode = 'ok';
    expect((await syncNow()).status).toBe('ok');

    expect(ctx.server.att.get(1)).toEqual({ status: 'absent', version: 1 }); // not applied twice
    expect(ctx.server.syncCalls[1][0].operation_id).toBe(ctx.server.syncCalls[0][0].operation_id);
    expect(await getOutboxRows()).toHaveLength(0);
  });

  it('applies the good operations and keeps the rejected one, which blocks new sessions', async () => {
    await mark(1, 'absent');
    await mark(2, 'late');
    // A student the server does not list, queued directly:
    const { runTx } = await import('../lib/db');
    await runTx(['outbox'], 'readwrite', ({ outbox }) => {
      outbox.put({ opId: 'bad-op', seq: 99, key: `${CLASS_ID}|${DATE}|999`, classId: CLASS_ID, date: DATE, studentId: 999, status: 'present', baseVersion: 0, state: 'pending' });
    });

    await syncNow();

    const left = await getOutboxRows();
    expect(left).toHaveLength(1);
    expect(left[0]).toMatchObject({ opId: 'bad-op', state: 'rejected', reason: 'not_enrolled' });
    expect(ctx.server.att.get(1).status).toBe('absent');
    expect((await checkGate()).reason).toBe('rejected');
  });

  it('keeps the queue and reports an expired login', async () => {
    await mark(1, 'absent');
    ctx.server.mode = '401';

    expect((await syncNow()).status).toBe('auth_expired');
    expect(await getOutboxRows()).toHaveLength(1);
  });

  it('keeps the queue when the device has been removed', async () => {
    await mark(1, 'absent');
    ctx.server.mode = '403';

    expect((await syncNow()).status).toBe('device_blocked');
    expect(await getOutboxRows()).toHaveLength(1);
  });

  it('marks the batch rejected when the server calls the request invalid, never deleting it', async () => {
    await mark(1, 'absent');
    ctx.server.mode = '422';

    expect((await syncNow()).status).toBe('rejected');
    const [row] = await getOutboxRows();
    expect(row).toMatchObject({ state: 'rejected', reason: 'invalid_request' });
  });

  it('sends a follow-up edit with the version the first one produced', async () => {
    await mark(1, 'absent');
    ctx.server.beforeRespond = async () => {
      ctx.server.beforeRespond = null;
      await mark(1, 'late'); // the teacher changes the mark while the request is in the network
    };

    await syncNow();

    expect(ctx.server.att.get(1)).toEqual({ status: 'late', version: 2 });
    expect(await getOutboxRows()).toHaveLength(0);
  });

  it('runs one sync at a time inside a tab', async () => {
    await mark(1, 'absent');

    const [a, b] = await Promise.all([syncNow(), syncNow()]);

    expect([a.status, b.status].sort()).toEqual(['ok', 'skipped']);
    expect(ctx.server.syncCalls).toHaveLength(1);
  });

  it('does nothing when another tab holds the lock', async () => {
    await mark(1, 'absent');
    const original = navigator.locks;
    Object.defineProperty(navigator, 'locks', { configurable: true, value: { request: (_n, _o, cb) => cb(null) } });

    try {
      expect((await syncNow()).status).toBe('skipped');
    } finally {
      Object.defineProperty(navigator, 'locks', { configurable: true, value: original });
    }

    expect(mobileApi.post).not.toHaveBeenCalled();
  });
});

describe('conflicts', () => {
  const makeConflict = async () => {
    ctx.server.att.set(1, { status: 'excused', version: 3 }); // an admin corrected it
    await mark(1, 'absent'); // the phone's roster said version 0
  };

  it('keeps the device mark, shows the server value, and blocks new sessions until resolved', async () => {
    await makeConflict();
    await syncNow();

    const [op] = await getOutboxRows();
    expect(op).toMatchObject({ state: 'conflict', status: 'absent' });
    expect(op.server).toMatchObject({ status: 'excused', version: 3 });
    expect(ctx.server.att.get(1).status).toBe('excused'); // nothing overwritten
    expect((await checkGate()).reason).toBe('conflict');
  });

  it('keep mine: the server applies the device mark and the queue empties', async () => {
    await makeConflict();
    await syncNow();
    const [op] = await getOutboxRows();

    await resolveConflict(op.opId, 'keep_local');

    expect(ctx.server.att.get(1).status).toBe('absent');
    expect(await getOutboxRows()).toHaveLength(0);
    expect((await checkGate()).ok).toBe(true);
  });

  it('use server: the device adopts the server mark and the queue empties', async () => {
    await makeConflict();
    await syncNow();
    const [op] = await getOutboxRows();

    await resolveConflict(op.opId, 'use_server');

    expect(ctx.server.att.get(1).status).toBe('excused');
    expect(await getOutboxRows()).toHaveLength(0);
    const view = await readSessionView(CLASS_ID, DATE);
    expect(view.students.find((s) => s.studentId === 1).status).toBe('excused');
    expect((await checkGate()).ok).toBe(true);
  });

  it('keeps the conflict when resolving fails (offline)', async () => {
    await makeConflict();
    await syncNow();
    const [op] = await getOutboxRows();
    ctx.server.mode = 'down';

    await expect(resolveConflict(op.opId, 'keep_local')).rejects.toBeTruthy();
    expect((await getOutboxRows())[0].state).toBe('conflict');
  });

  it('never sends later edits of a student whose change is in conflict', async () => {
    await makeConflict();
    await syncNow();
    const calls = ctx.server.syncCalls.length;

    await syncNow();
    expect(ctx.server.syncCalls.length).toBe(calls); // nothing left that may be sent
  });
});

describe('sync lock fallback', () => {
  it('skips when another tab holds a live lease', async () => {
    const original = navigator.locks;
    Object.defineProperty(navigator, 'locks', { configurable: true, value: undefined });
    localStorage.setItem('guroassist.mobile.sync-lease', JSON.stringify({ owner: 'other-tab', expiresAt: Date.now() + 10_000 }));
    const work = vi.fn(async () => ({ status: 'ok' }));

    try {
      expect(await withSyncLock(work)).toEqual({ status: 'skipped' });
      expect(work).not.toHaveBeenCalled();

      localStorage.setItem('guroassist.mobile.sync-lease', JSON.stringify({ owner: 'other-tab', expiresAt: Date.now() - 1 }));
      expect(await withSyncLock(work)).toEqual({ status: 'ok' });
      expect(localStorage.getItem('guroassist.mobile.sync-lease')).toBeNull();
    } finally {
      Object.defineProperty(navigator, 'locks', { configurable: true, value: original });
      localStorage.clear();
    }
  });
});
