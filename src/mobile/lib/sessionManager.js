import mobileApi from './mobileApi';
import { evaluateGate, STORAGE_BLOCK } from './gate';
import { runTx, req } from './db';
import { StorageError } from './constants';
import { cacheGet, cachePutMany, getCurrentSession, latestRosterKey, layoutKey, readSessionView, rosterKey } from './attendanceStore';

const isAuthProblem = (e) => e?.status === 401 || (e?.status === 403 && ['device_not_approved', 'device_revoked'].includes(e?.code));

export async function downloadClasses() {
  const { data } = await mobileApi.get('/classes');
  const classes = (data.data ?? []).filter((c) => !c.status || c.status === 'active');
  await cachePutMany([['classes', classes]]);
  return classes;
}

/**
 * Returns the class list plus WHY it may be empty: `offline` when the server could not be reached, and
 * `error` when the server answered with a failure, so the screen never has to guess.
 */
export async function loadClasses() {
  try {
    return { classes: await downloadClasses(), offline: false, error: null };
  } catch (e) {
    if (isAuthProblem(e)) throw e;
    const cached = (await cacheGet('classes')) ?? [];
    if (e?.status) return { classes: cached, offline: false, error: { status: e.status, message: e.message } };
    return { classes: cached, offline: true, error: null };
  }
}

/**
 * Gets the roster and seating chart for a class and day, from the server when reachable and from the
 * device otherwise. Returns false when nothing usable exists offline.
 */
async function prepareData(classId, date) {
  try {
    const [roster, layout] = await Promise.all([
      mobileApi.get('/attendance', { params: { class_assignment_id: classId, date } }),
      mobileApi.get(`/class-assignments/${classId}/seating-layout`),
    ]);
    const rosterData = roster.data.data;
    await cachePutMany([
      [rosterKey(classId, date), rosterData],
      [latestRosterKey(classId), rosterData],
      [layoutKey(classId), layout.data.data],
    ]);
    return true;
  } catch (e) {
    if (isAuthProblem(e)) throw e;
    if (e?.status && e.status < 500) throw e; // a real answer such as 403 or 404 is not an outage
  }

  const have = (await cacheGet(rosterKey(classId, date))) ?? (await cacheGet(latestRosterKey(classId)));
  return Boolean(have);
}

/**
 * The ONLY way into an attendance session. Resuming the open session is always allowed. Opening any
 * other class or day passes the gate, which reads the durable queue and writes the new session in the
 * same transaction, so two tabs cannot both slip through.
 */
export async function openSession({ classId, date }) {
  let usable;
  try {
    usable = await prepareData(classId, date);
  } catch (e) {
    if (isAuthProblem(e)) throw e;
    if (e instanceof StorageError) return STORAGE_BLOCK;
    return { ok: false, reason: 'server_refused', message: e?.message ?? 'The server refused this class.' };
  }

  if (!usable) {
    return { ok: false, reason: 'not_downloaded', message: 'This class is not saved on this device yet. Connect to the internet once to download it.' };
  }

  // Server half of the gate: it knows about conflicts parked for this teacher. It cannot see unsent
  // device changes, which is why the local queue below is the authority.
  let current = null;
  try { current = await getCurrentSession(); } catch { return STORAGE_BLOCK; }
  const resuming = current && current.classId === classId && current.date === date;

  if (!resuming) {
    try {
      const { data } = await mobileApi.get('/attendance/sync/readiness', { timeout: 5000 });
      if (data?.data?.unresolved_conflicts > 0) {
        return { ok: false, reason: 'server_conflicts', counts: null, message: 'The server holds unresolved conflicts for you. Resolve them first.' };
      }
    } catch (e) {
      if (isAuthProblem(e)) throw e;
      // Unreachable server: the local queue alone decides.
    }
  }

  let outcome;
  try {
    outcome = await runTx(['outbox', 'meta'], 'readwrite', async ({ outbox, meta }) => {
      const row = (await req(meta.get('current')))?.value;
      const same = row && row.classId === classId && row.date === date;

      if (!same) {
        const gate = evaluateGate(await req(outbox.getAll()));
        if (!gate.ok) return gate;
      }

      meta.put({ k: 'current', value: { classId, date, openedAt: Date.now() } });
      return { ok: true };
    });
  } catch {
    return STORAGE_BLOCK;
  }

  if (!outcome.ok) return outcome;

  return { ok: true, view: await readSessionView(classId, date) };
}

export async function resumeSession() {
  const current = await getCurrentSession();
  if (!current) return null;

  const view = await readSessionView(current.classId, current.date);
  return view.hasRoster ? view : null;
}
