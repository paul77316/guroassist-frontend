import { useEffect, useState } from 'react';
import { loadClasses, openSession } from '../lib/sessionManager';
import { getCurrentSession } from '../lib/attendanceStore';
import { todayLocal } from '../hooks';

const label = (c) => `${c.grade_level ?? ''} - ${c.section ?? ''} (${c.subject ?? ''})`;

export default function ClassesScreen({ onOpened, onBack, onAuthProblem }) {
  const [classes, setClasses] = useState([]);
  const [offline, setOffline] = useState(false);
  const [loadError, setLoadError] = useState(null);
  const [loading, setLoading] = useState(true);
  const [date, setDate] = useState(todayLocal());
  const [current, setCurrent] = useState(null);
  const [blocked, setBlocked] = useState(null);
  const [opening, setOpening] = useState(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [result, session] = await Promise.all([loadClasses(), getCurrentSession().catch(() => null)]);
        if (cancelled) return;
        setClasses(result.classes);
        setOffline(result.offline);
        setLoadError(result.error);
        setCurrent(session);
      } catch (e) {
        if (!cancelled) {
          onAuthProblem?.(e);
          setLoadError({ status: e?.status, message: e?.code === 'device_revoked' ? 'This phone was removed. Ask an administrator.' : e?.status === 401 ? 'Your sign-in expired. Sign in again.' : (e?.message ?? 'Not allowed.') });
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [onAuthProblem]);

  const open = async (classId) => {
    setBlocked(null);
    setOpening(classId);
    try {
      const result = await openSession({ classId, date });
      if (result.ok) onOpened(result.view);
      else setBlocked(result);
    } catch (e) {
      onAuthProblem?.(e);
    } finally {
      setOpening(null);
    }
  };

  const currentClass = current && classes.find((c) => c.id === current.classId);

  return (
    <main className="mobile-app mobile-page">
      <div className="mobile-screen-heading">
        <div className="mobile-brand-heading"><span className="mobile-brand-mark">GA</span><div><p>GuroAssist</p><h1>Choose a class</h1></div></div>
        {onBack && <button onClick={onBack} className="min-h-11 rounded-lg border border-slate-300 bg-white px-3 text-xs font-semibold text-slate-700 shadow-sm">Back to session</button>}
      </div>

      {offline && <p role="status" className="mt-2 rounded-lg bg-gray-100 p-2 text-sm text-gray-700">No connection. Showing classes saved on this phone.</p>}
      {loadError && (
        <p role="alert" className="mt-2 rounded-lg border-2 border-red-300 bg-red-50 p-3 text-sm text-red-900">
          Couldn’t load your classes{loadError.status ? ` (error ${loadError.status})` : ''}: {loadError.message}
        </p>
      )}

      {current && (
        <div className="mobile-panel mt-3 border-blue-100 bg-blue-50 p-3 text-sm text-blue-900">
          Open now: <b>{currentClass ? label(currentClass) : `Class ${current.classId}`}</b> · {current.date}
        </div>
      )}

      <label className="mobile-field-label mobile-panel mt-4 block p-4">
        Date
        <input type="date" value={date} max={todayLocal()} onChange={(e) => e.target.value && setDate(e.target.value)} className="mobile-field mt-1 w-full px-3 text-base" />
      </label>

      {blocked && (
        <div role="alert" className="mt-3 rounded-lg border-2 border-red-300 bg-red-50 p-3 text-sm text-red-900">
          <p className="font-bold">Can’t start a new session yet</p>
          <p className="mt-1">{blocked.message}</p>
        </div>
      )}

      {loading ? (
        <p className="mt-4 text-sm text-gray-600">Loading classes…</p>
      ) : classes.length === 0 ? (
        <p className="mt-4 rounded-lg border border-dashed border-gray-300 p-4 text-center text-sm text-gray-600">
          {offline
            ? 'No classes are saved on this phone yet. Connect to the internet once to download them.'
            : loadError
              ? 'No classes could be loaded.'
              : 'No classes are assigned to your account. Add or assign a class on the web first, then reopen this screen.'}
        </p>
      ) : (
        <ul className="mt-4 space-y-2">
          {classes.map((c) => (
            <li key={c.id}>
              <button
                onClick={() => open(c.id)}
                disabled={opening !== null}
                className="mobile-class-option disabled:opacity-50"
              >
                {label(c)}
                {opening === c.id && <span className="ml-2 text-sm text-gray-500">Opening…</span>}
              </button>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
