import { useEffect, useState } from 'react';
import { cacheGet, getOutboxRows, discardOperation, latestRosterKey } from '../lib/attendanceStore';
import { resolveConflict, syncNow } from '../lib/sync';
import { STATUS_META } from '../lib/constants';
import { notifyOutboxChanged } from '../hooks';

const REASONS = {
  not_enrolled: 'The student is no longer enrolled in this class.',
  forbidden: 'You no longer have access to this class.',
  class_archived: 'This class was archived.',
  class_not_found: 'This class no longer exists.',
  future_date: 'The date is in the future.',
  operation_id_reused: 'The server could not accept this change.',
  invalid_request: 'The server could not read this change.',
};

const label = (status) => (status ? STATUS_META[status]?.label ?? status : 'no mark');

/** Conflicts and server-rejected changes. They stay on the device until someone decides. */
export default function ProblemsPanel({ refreshKey }) {
  const [rows, setRows] = useState([]);
  const [names, setNames] = useState({});
  const [busy, setBusy] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const problems = (await getOutboxRows()).filter((o) => o.state === 'conflict' || o.state === 'rejected');
        const found = {};
        for (const classId of new Set(problems.map((o) => o.classId))) {
          const roster = await cacheGet(latestRosterKey(classId));
          roster?.students?.forEach((s) => { found[`${classId}|${s.student_id}`] = s.full_name; });
        }
        if (!cancelled) { setRows(problems); setNames(found); }
      } catch { /* the badge already shows storage trouble */ }
    })();
    return () => { cancelled = true; };
  }, [refreshKey]);

  if (rows.length === 0) return null;

  const run = async (op, action) => {
    setBusy(op.opId);
    setError(null);
    try {
      await action();
      notifyOutboxChanged();
      syncNow();
    } catch (e) {
      setError(e?.status === null || e?.status === undefined ? 'You need a connection to do this.' : (e?.message ?? 'That did not work.'));
    } finally {
      setBusy(null);
    }
  };

  return (
    <section className="mobile-problem-card mt-4 p-3" aria-label="Changes that need attention">
      <h2 className="text-sm font-bold text-red-900">Changes that need your attention</h2>
      <p className="mt-1 text-xs text-red-900">Your changes are kept on this device. A new session stays blocked until each one is settled.</p>
      {error && <p role="alert" className="mt-2 text-sm font-medium text-red-800">{error}</p>}

      <ul className="mt-2 space-y-2">
        {rows.map((op) => (
          <li key={op.opId} className="rounded-lg bg-white p-3 text-sm text-gray-900">
            <p className="font-semibold">{names[`${op.classId}|${op.studentId}`] ?? `Student ${op.studentId}`} · {op.date}</p>
            {op.state === 'conflict' ? (
              <>
                <p className="mt-1 text-gray-700">Your phone: <b>{label(op.status)}</b>. The server now says: <b>{label(op.server?.status)}</b>.</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  <button disabled={busy === op.opId} onClick={() => run(op, () => resolveConflict(op.opId, 'keep_local'))} className="min-h-11 rounded-lg bg-blue-700 px-3 text-white disabled:opacity-50">Keep mine</button>
                  <button disabled={busy === op.opId} onClick={() => run(op, () => resolveConflict(op.opId, 'use_server'))} className="min-h-11 rounded-lg border border-gray-400 px-3 disabled:opacity-50">Use server’s</button>
                </div>
              </>
            ) : (
              <>
                <p className="mt-1 text-gray-700">{REASONS[op.reason] ?? 'The server rejected this change.'} Your mark was <b>{label(op.status)}</b>.</p>
                <button
                  disabled={busy === op.opId}
                  onClick={() => {
                    if (window.confirm('Discard this change from the phone? It cannot be recovered. Ask an administrator first if the attendance still matters.')) run(op, () => discardOperation(op.opId));
                  }}
                  className="mt-2 min-h-11 rounded-lg border border-red-500 px-3 text-red-800 disabled:opacity-50"
                >
                  Discard from this phone
                </button>
              </>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}
