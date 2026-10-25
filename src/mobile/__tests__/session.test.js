import { beforeEach, describe, expect, it, vi } from 'vitest';
import { CLASS_ID, DATE, freshDevice } from './helpers';
import { markAttendance, getOutboxRows } from '../lib/attendanceStore';
import mobileApi from '../lib/mobileApi';
import { loadClasses, openSession, resumeSession } from '../lib/sessionManager';
import { syncNow } from '../lib/sync';
import { closeAccountDb, runTx } from '../lib/db';

vi.mock('../lib/mobileApi', () => ({ default: { get: vi.fn(), post: vi.fn() } }));

const NEXT = '2030-03-11';
const mark = (studentId, status, date = DATE) => markAttendance({ classId: CLASS_ID, date, studentId, status });
const open = (date) => openSession({ classId: CLASS_ID, date });
let ctx;

const setState = (state) => runTx(['outbox'], 'readwrite', async ({ outbox }) => {
  const rows = await new Promise((resolve) => { const r = outbox.getAll(); r.onsuccess = () => resolve(r.result); });
  rows.forEach((op) => outbox.put({ ...op, state }));
});

beforeEach(async () => {
  ctx = await freshDevice();
});

describe('opening attendance sessions', () => {
  it('opens the first session and the same session again', async () => {
    expect((await open(DATE)).ok).toBe(true);
    await mark(1, 'absent');
    expect((await open(DATE)).ok).toBe(true); // resuming is always allowed
  });

  it('blocks a different day while a change is pending, but the open session stays usable', async () => {
    await open(DATE);
    await mark(1, 'absent');

    const blocked = await open(NEXT);
    expect(blocked).toMatchObject({ ok: false, reason: 'pending' });

    await mark(2, 'late'); // still editable
    expect((await getOutboxRows()).length).toBe(2);
  });

  it.each(['inflight', 'conflict', 'rejected'])('blocks a new session while an operation is %s', async (state) => {
    await open(DATE);
    await mark(1, 'absent');
    await setState(state);

    expect(await open(NEXT)).toMatchObject({ ok: false, reason: state });
  });

  it('blocks a different class even on the same day', async () => {
    await open(DATE);
    await mark(1, 'absent');

    const other = await openSession({ classId: 11, date: DATE });
    expect(other.ok).toBe(false);
  });

  it('blocks while offline and unsynced, then opens once the server has confirmed everything', async () => {
    await open(DATE);
    await mark(1, 'absent');

    ctx.server.mode = 'down';
    expect((await syncNow()).status).toBe('offline');
    expect((await open(NEXT)).ok).toBe(false);

    ctx.server.mode = 'ok';
    expect((await syncNow()).status).toBe('ok');
    expect((await open(NEXT)).ok).toBe(true);
  });

  it('does not open a session that was never downloaded when offline', async () => {
    ctx.server.mode = 'down';
    expect(await open(DATE)).toMatchObject({ ok: false, reason: 'not_downloaded' });
  });

  it('opens a downloaded class offline, marked as not verified for a new day', async () => {
    await open(DATE);
    ctx.server.mode = 'down';

    const result = await open(NEXT);
    expect(result.ok).toBe(true);
    expect(result.view.unverified).toBe(true);
    expect(result.view.students.every((s) => s.status === null)).toBe(true);
  });

  it('fails closed when local storage cannot be read', async () => {
    await open(DATE);
    closeAccountDb();

    expect(await open(NEXT)).toMatchObject({ ok: false, reason: 'storage_unreadable' });
  });

  it('fails closed on a corrupt queued row', async () => {
    await open(DATE);
    await runTx(['outbox'], 'readwrite', ({ outbox }) => { outbox.put({ opId: 'broken', seq: 1 }); });

    expect(await open(NEXT)).toMatchObject({ ok: false, reason: 'storage_corrupt' });
  });

  it('honours unresolved conflicts the server reports', async () => {
    await open(DATE);
    ctx.server.parked.set('x', { op: {}, server: {} });

    expect(await open(NEXT)).toMatchObject({ ok: false, reason: 'server_conflicts' });
  });

  it('still decides from the local queue when the server is unreachable', async () => {
    await open(DATE);
    ctx.server.mode = 'down';
    expect((await open(NEXT)).ok).toBe(true);
  });

  it('resumes the open session after a restart', async () => {
    await open(DATE);
    await mark(3, 'excused');

    const view = await resumeSession();
    expect(view.date).toBe(DATE);
    expect(view.students.find((s) => s.studentId === 3).status).toBe('excused');
  });
});

describe('loading the class list', () => {
  it('reports an empty account as empty, not as a connection problem', async () => {
    mobileApi.get.mockResolvedValueOnce({ data: { data: [] } });
    expect(await loadClasses()).toEqual({ classes: [], offline: false, error: null });
  });

  it('reports a server failure with its status instead of hiding it', async () => {
    mobileApi.get.mockRejectedValueOnce({ status: 500, message: 'Server error' });
    expect(await loadClasses()).toMatchObject({ offline: false, error: { status: 500, message: 'Server error' } });
  });

  it('falls back to saved classes only when the server cannot be reached', async () => {
    expect((await loadClasses()).classes).toHaveLength(1);
    ctx.server.mode = 'down';
    expect(await loadClasses()).toMatchObject({ offline: true, error: null });
    expect((await loadClasses()).classes).toHaveLength(1);
  });
});

describe('two tabs', () => {
  it('lets only one of two simultaneous openers win when work is pending', async () => {
    await open(DATE);
    await mark(1, 'absent');

    const [a, b] = await Promise.all([open('2030-03-12'), open('2030-03-13')]);
    expect(a.ok).toBe(false);
    expect(b.ok).toBe(false);
  });

  it('refuses marks from the tab that lost a race to open a different session', async () => {
    await open(DATE);   // tab A is working here
    await open(NEXT);   // tab B opens another day while the queue is empty
    await expect(mark(1, 'absent', DATE)).rejects.toThrow(/different attendance session/);

    await mark(1, 'absent', NEXT);
    expect((await open('2030-03-14')).ok).toBe(false); // and now the gate holds
  });
});
