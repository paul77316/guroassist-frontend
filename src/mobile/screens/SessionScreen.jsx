import { useMemo, useState } from 'react';
import SeatChart from '../components/SeatChart';
import StatusSheet from '../components/StatusSheet';
import SyncBadge from '../components/SyncBadge';
import ProblemsPanel from '../components/ProblemsPanel';
import { markAttendance, markManyAttendance, readSessionView } from '../lib/attendanceStore';
import { syncNow } from '../lib/sync';
import { SessionChangedError, StudentBlockedError } from '../lib/constants';
import { notifyOutboxChanged, useOnline, useOutboxSummary, useSyncState } from '../hooks';

export default function SessionScreen({ view, classLabel, authExpired, onViewChange, onChangeSession, onSignIn, onSignOut }) {
  const online = useOnline();
  const sync = useSyncState();
  const { summary, storageOk } = useOutboxSummary();
  const [picked, setPicked] = useState(null);
  const [highlight, setHighlight] = useState(false);
  const [message, setMessage] = useState(null);
  const [bulkSaving, setBulkSaving] = useState(false);

  const counts = useMemo(() => {
    const c = { present: 0, absent: 0, late: 0, excused: 0, unmarked: 0 };
    view.students.forEach((s) => { c[s.status ?? 'unmarked'] += 1; });
    return c;
  }, [view.students]);

  const choose = async (status) => {
    const student = picked;
    setPicked(null);
    setMessage(null);

    try {
      // The screen changes only after the mark and its queue entry are committed to the phone.
      await markAttendance({ classId: view.classId, date: view.date, studentId: student.studentId, status });
      onViewChange(await readSessionView(view.classId, view.date));
      notifyOutboxChanged();
      if (navigator.onLine) syncNow();
    } catch (e) {
      if (e instanceof SessionChangedError) setMessage('Another window opened a different session. Reload this page to continue.');
      else if (e instanceof StudentBlockedError) setMessage(e.message);
      else setMessage('NOT saved. This phone could not store the change. Try again, and tell your administrator if it keeps happening.');
    }
  };

  const markUnmarkedPresent = async () => {
    const studentIds = view.students.filter((student) => student.status === null).map((student) => student.studentId);
    if (studentIds.length === 0) return;

    setBulkSaving(true);
    setMessage(null);
    try {
      const saved = await markManyAttendance({ classId: view.classId, date: view.date, studentIds, status: 'present' });
      onViewChange(await readSessionView(view.classId, view.date));
      notifyOutboxChanged();
      setMessage(`Marked ${saved} unmarked student${saved === 1 ? '' : 's'} present on this device.`);
      if (navigator.onLine) syncNow();
    } catch (e) {
      if (e instanceof SessionChangedError) setMessage('Another window opened a different session. Reload this page to continue.');
      else if (e instanceof StudentBlockedError) setMessage(e.message);
      else setMessage('NOT saved. This phone could not store the changes. Try again, and tell your administrator if it keeps happening.');
    } finally {
      setBulkSaving(false);
    }
  };

  const syncButton = async () => {
    setMessage(null);
    const result = await syncNow();
    if (result.status === 'offline') setMessage('The server could not be reached. Your changes are safe on this phone.');
    if (result.status === 'auth_expired') setMessage('Your sign-in expired. Your changes are safe. Sign in to sync them.');
    if (result.status === 'device_blocked') setMessage('This phone is no longer approved. Your changes are kept. Ask an administrator.');
    if (result.status === 'throttled') setMessage('Too many requests. Try again in a minute.');
    onViewChange(await readSessionView(view.classId, view.date));
  };

  return (
    <main className="mx-auto max-w-lg p-3 pb-24">
      <header className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h1 className="text-lg font-bold text-gray-900">{classLabel}</h1>
          <p className="text-sm text-gray-600">{view.date}</p>
        </div>
        <SyncBadge summary={summary} syncing={sync.syncing} online={online} storageOk={storageOk} authExpired={authExpired} />
      </header>

      {view.unverified && (
        <p role="status" className="mt-2 rounded-lg bg-amber-100 p-2 text-sm text-amber-900">
          This day was opened offline from your saved class list. It will be checked against the server when you sync.
        </p>
      )}
      {authExpired && (
        <div role="status" className="mt-2 flex items-center justify-between gap-2 rounded-lg bg-amber-100 p-2 text-sm text-amber-900">
          <span>Sign-in expired. You can keep marking. Sign in to sync.</span>
          <button onClick={onSignIn} className="min-h-11 rounded-lg bg-amber-700 px-3 text-white">Sign in</button>
        </div>
      )}
      {message && <p role="alert" className="mt-2 rounded-lg bg-red-100 p-2 text-sm font-medium text-red-900">{message}</p>}

      <p className="mt-3 text-sm text-gray-700" aria-live="polite">
        {counts.present} present · {counts.absent} absent · {counts.late} late · {counts.excused} excused · <b>{counts.unmarked} unmarked</b>
      </p>

      <button
        type="button"
        onClick={markUnmarkedPresent}
        disabled={bulkSaving || counts.unmarked === 0}
        className="mt-3 min-h-12 w-full rounded-lg bg-green-700 px-4 text-sm font-semibold text-white disabled:bg-gray-300 disabled:text-gray-600"
      >
        {bulkSaving ? 'Marking students…' : counts.unmarked > 0 ? `Mark ${counts.unmarked} unmarked present` : 'All students are marked'}
      </button>

      <div className="mt-3">
        <SeatChart students={view.students} layout={view.layout} highlightUnmarked={highlight} onPick={setPicked} />
      </div>

      <ProblemsPanel refreshKey={`${summary.conflict}-${summary.rejected}-${summary.total}`} />

      <nav className="fixed inset-x-0 bottom-0 border-t border-gray-300 bg-white p-2" style={{ paddingBottom: 'max(0.5rem, env(safe-area-inset-bottom))' }}>
        <div className="mx-auto flex max-w-lg gap-2">
          <button onClick={() => setHighlight((h) => !h)} aria-pressed={highlight} className={`min-h-12 flex-1 rounded-lg border text-sm font-semibold ${highlight ? 'border-amber-500 bg-amber-100' : 'border-gray-300'}`}>Unmarked</button>
          <button onClick={syncButton} disabled={sync.syncing} className="min-h-12 flex-1 rounded-lg bg-blue-700 text-sm font-semibold text-white disabled:opacity-50">{sync.syncing ? 'Syncing…' : 'Sync now'}</button>
          <button onClick={onChangeSession} className="min-h-12 flex-1 rounded-lg border border-gray-300 text-sm font-semibold">Classes</button>
          <button onClick={onSignOut} className="min-h-12 rounded-lg border border-gray-300 px-3 text-sm">Sign out</button>
        </div>
      </nav>

      <StatusSheet student={picked} onChoose={choose} onClose={() => setPicked(null)} />
    </main>
  );
}
