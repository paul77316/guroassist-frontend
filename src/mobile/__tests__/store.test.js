import { IDBObjectStore } from 'fake-indexeddb';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { CLASS_ID, DATE, freshDevice } from './helpers';
import { markAttendance, getOutboxRows, readSessionView, discardOperation } from '../lib/attendanceStore';
import { openSession } from '../lib/sessionManager';
import { closeAccountDb, openAccountDb, runTx, req } from '../lib/db';
import { checkGate } from '../lib/gate';
import { SessionChangedError, StudentBlockedError } from '../lib/constants';

vi.mock('../lib/mobileApi', () => ({ default: { get: vi.fn(), post: vi.fn() } }));

const mark = (studentId, status) => markAttendance({ classId: CLASS_ID, date: DATE, studentId, status });
let ctx;

beforeEach(async () => {
  ctx = await freshDevice();
  expect((await openSession({ classId: CLASS_ID, date: DATE })).ok).toBe(true);
});

describe('durable local marks', () => {
  it('commits the record and its outbox operation together before resolving', async () => {
    await mark(1, 'absent');

    const rows = await getOutboxRows();
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ studentId: 1, status: 'absent', state: 'pending', baseVersion: 0 });

    const view = await readSessionView(CLASS_ID, DATE);
    expect(view.students.find((s) => s.studentId === 1)).toMatchObject({ status: 'absent', syncState: 'pending' });
  });

  it('writes nothing at all when the save fails midway', async () => {
    const original = IDBObjectStore.prototype.put;
    let calls = 0;
    IDBObjectStore.prototype.put = function patched(...args) {
      calls += 1;
      if (this.name === 'records') throw new Error('quota exceeded');
      return original.apply(this, args);
    };

    try {
      await expect(mark(1, 'absent')).rejects.toBeTruthy();
    } finally {
      IDBObjectStore.prototype.put = original;
    }

    expect(calls).toBeGreaterThan(0);
    expect(await getOutboxRows()).toHaveLength(0);
    const view = await readSessionView(CLASS_ID, DATE);
    expect(view.students.every((s) => s.status === null)).toBe(true);
  });

  it('rejects the mark when storage is unavailable', async () => {
    closeAccountDb();
    await expect(mark(1, 'absent')).rejects.toBeTruthy();
  });

  it('keeps one operation when the same student is changed again before sync', async () => {
    await mark(1, 'absent');
    await mark(1, 'late');
    await mark(1, 'present');

    const rows = await getOutboxRows();
    expect(rows).toHaveLength(1);
    expect(rows[0].status).toBe('present');
  });

  it('queues a change behind an unconfirmed one with an unknown base version', async () => {
    await mark(1, 'absent');
    await runTx(['outbox'], 'readwrite', async ({ outbox }) => {
      const [op] = await req(outbox.getAll());
      outbox.put({ ...op, state: 'inflight' });
    });

    await mark(1, 'late');

    const rows = await getOutboxRows();
    expect(rows).toHaveLength(2);
    expect(rows[1]).toMatchObject({ status: 'late', baseVersion: null, state: 'pending' });
  });

  it('refuses to change a student whose last change is in conflict or rejected', async () => {
    await mark(1, 'absent');
    await runTx(['outbox'], 'readwrite', async ({ outbox }) => {
      const [op] = await req(outbox.getAll());
      outbox.put({ ...op, state: 'conflict' });
    });

    await expect(mark(1, 'late')).rejects.toBeInstanceOf(StudentBlockedError);
  });

  it('refuses a mark when another tab has switched to a different session', async () => {
    await runTx(['meta'], 'readwrite', ({ meta }) => {
      meta.put({ k: 'current', value: { classId: CLASS_ID, date: '2030-03-11', openedAt: 1 } });
    });

    await expect(mark(1, 'absent')).rejects.toBeInstanceOf(SessionChangedError);
    expect(await getOutboxRows()).toHaveLength(0);
  });

  it('survives a reload and still blocks a new session afterwards', async () => {
    await mark(2, 'late');
    const userId = ctx.userId;

    closeAccountDb();
    await openAccountDb(userId); // the page reloaded: same account, same database

    const rows = await getOutboxRows();
    expect(rows).toHaveLength(1);
    expect((await checkGate()).ok).toBe(false);

    ctx.server.mode = 'down'; // still offline after the reload
    const next = await openSession({ classId: CLASS_ID, date: '2030-03-11' });
    expect(next.ok).toBe(false);
    expect(next.reason).toBe('pending');
  });

  it('keeps each account in its own database', async () => {
    await mark(1, 'absent');
    await openAccountDb(ctx.userId + 1000);
    expect(await getOutboxRows()).toHaveLength(0);
  });

  it('returns to the cached server state when a rejected change is discarded', async () => {
    await mark(1, 'absent');
    const [op] = await getOutboxRows();

    await discardOperation(op.opId);

    expect(await getOutboxRows()).toHaveLength(0);
    const view = await readSessionView(CLASS_ID, DATE);
    expect(view.students.find((s) => s.studentId === 1).status).toBeNull();
  });
});
