import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useNotificationSummary } from '../../hooks/useNotifications';

const plural = (n, one, many) => `${n} ${n === 1 ? one : many}`;
const formatAttendanceDate = (date) => {
  const [year, month, day] = date.split('-').map(Number);
  return new Date(year, month - 1, day).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
};

/**
 * The reminder bell in the top bar. It shows counts only, never names or notes, and only appears
 * after the teacher switches reminders on in Settings. It only updates while GuroAssist is open.
 */
export default function NotificationBell() {
  const { data } = useNotificationSummary();
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    if (!open) return undefined;

    const onDown = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    const onKey = (e) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);

    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  if (!data?.enabled) return null;

  const due = data.follow_ups_due;
  const review = data.students_to_review;
  const mobileAttendanceSynced = data.mobile_attendance_synced ?? 0;
  const mobileAttendanceSyncs = data.mobile_attendance_syncs ?? [];
  const count = data.badge_count;

  const parts = [];
  if (due.interventions > 0) parts.push(plural(due.interventions, 'intervention', 'interventions'));
  if (due.parent_contacts > 0) parts.push(plural(due.parent_contacts, 'parent contact', 'parent contacts'));
  if (due.overdue > 0) parts.push(`${due.overdue} overdue`);

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-label={count === 0 ? 'Reminders, nothing due' : `Reminders, ${count} to look at`}
        className="relative rounded-md p-2 text-gray-600 hover:bg-gray-100"
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" />
          <path d="M13.7 21a2 2 0 0 1-3.4 0" />
        </svg>
        {count > 0 && (
          <span className="absolute -right-0.5 -top-0.5 min-w-[1.1rem] rounded-full bg-blue-600 px-1 text-center text-[10px] font-semibold leading-[1.1rem] text-white">
            {count > 99 ? '99+' : count}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 z-30 mt-2 w-72 rounded-lg border border-gray-200 bg-white p-4 shadow-lg">
          <h3 className="text-sm font-semibold text-gray-900">Reminders</h3>

          {count === 0 ? (
            <p className="mt-2 text-sm text-gray-500">Nothing is due. You are up to date.</p>
          ) : (
            <ul className="mt-2 space-y-2 text-sm">
              {due.total > 0 && (
                <li>
                  <p className="text-gray-900">{plural(due.total, 'follow-up', 'follow-ups')} due</p>
                  {parts.length > 0 && <p className="text-xs text-gray-500">{parts.join(', ')}</p>}
                </li>
              )}
              {review > 0 && (
                <li>
                  <p className="text-gray-900">{plural(review, 'student', 'students')} to review</p>
                </li>
              )}
              {mobileAttendanceSynced > 0 && mobileAttendanceSyncs.map((sync) => (
                <li key={`${sync.class}-${sync.attendance_date}`}>
                  <p className="text-gray-900">Attendance synced for {sync.class}</p>
                  <p className="text-xs text-gray-500">
                    {formatAttendanceDate(sync.attendance_date)} · {plural(sync.marks_count, 'mark', 'marks')}
                  </p>
                </li>
              ))}
            </ul>
          )}

          <Link
            to={due.total > 0 || review > 0 ? '/interventions' : '/attendance'}
            onClick={() => setOpen(false)}
            className="mt-3 inline-block rounded-md border border-gray-300 px-3 py-1.5 text-sm hover:bg-gray-50"
          >
            {due.total > 0 || review > 0 ? 'Open Interventions' : 'Open Attendance'}
          </Link>

          <p className="mt-3 text-xs text-gray-400">
            These are reminders for you. They show counts, not names, and update while GuroAssist is open.
          </p>
        </div>
      )}
    </div>
  );
}
