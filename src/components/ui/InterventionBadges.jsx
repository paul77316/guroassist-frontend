// Neutral labels only. These describe the record, never the student.

const STATUS = {
  planned: 'bg-gray-100 text-gray-700',
  in_progress: 'bg-blue-100 text-blue-700',
  requires_follow_up: 'bg-amber-100 text-amber-700',
  completed: 'bg-green-100 text-green-700',
};

const FOLLOW_UP = {
  overdue: ['bg-red-100 text-red-700', 'Follow-up overdue'],
  due_today: ['bg-amber-100 text-amber-700', 'Follow-up due today'],
  upcoming: ['bg-blue-50 text-blue-700', 'Follow-up upcoming'],
};

export const ENTRY_LABELS = {
  followup: 'Follow-up',
  rescheduled: 'Rescheduled',
  completed: 'Completed',
  reopened: 'Reopened',
};

const base = 'inline-block rounded-full px-2 py-0.5 text-xs font-medium';

export function StatusBadge({ status, label }) {
  return <span className={`${base} ${STATUS[status] ?? STATUS.planned}`}>{label ?? status}</span>;
}

/** state: overdue | due_today | upcoming | null (nothing active to follow up) */
export function FollowUpBadge({ state }) {
  if (!state || !FOLLOW_UP[state]) return null;
  const [cls, text] = FOLLOW_UP[state];
  return <span className={`${base} ${cls}`}>{text}</span>;
}
