import { Link } from 'react-router-dom';
import { useDashboardToday } from '../../hooks/useDashboardToday';

function Card({ title, value, lines, label, icon, iconBg }) {
  return (
    <Link
      to="/interventions"
      aria-label={label}
      className="block rounded-lg border border-gray-200 bg-white p-4 shadow-sm transition hover:border-gray-300 hover:shadow focus:outline-none focus:ring-2 focus:ring-blue-500"
    >
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-gray-500">{title}</p>
          <p className="mt-1 text-3xl font-semibold text-gray-900">{value}</p>
        </div>
        <div className={`${iconBg} p-2 rounded-lg text-white`}>
          {icon}
        </div>
      </div>
      <div className="mt-2 space-y-0.5 text-sm text-gray-600">
        {lines.map((line) => (
          <p key={line.text} className={line.warn ? 'font-medium text-amber-700' : ''}>
            {line.text}
          </p>
        ))}
      </div>
    </Link>
  );
}

function plural(n, one, many) {
  return n + ' ' + (n === 1 ? one : many);
}

export default function TodayPanel() {
  const { data, isLoading, isError, error, refetch, isFetching } = useDashboardToday();

  if (isLoading) {
    return (
      <div role="status" aria-label="Loading today summary" className="mt-4 grid gap-4 sm:grid-cols-3">
        {[0, 1, 2].map((i) => (
          <div key={i} className="h-28 animate-pulse rounded-lg border border-gray-200 bg-gray-100" />
        ))}
      </div>
    );
  }

  if (isError) {
    return (
      <div role="alert" className="mt-4 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800">
        <p>{error?.message || 'Could not load the summary for today.'}</p>
        <button
          type="button"
          onClick={() => refetch()}
          disabled={isFetching}
          className="mt-2 rounded border border-red-300 bg-white px-3 py-1 text-red-800 hover:bg-red-100 disabled:opacity-50"
        >
          {isFetching ? 'Trying again...' : 'Try again'}
        </button>
      </div>
    );
  }

  // Admins have no teacher records: no panel.
  if (!data || data.applies === false) return null;

  const due = data.follow_ups_due;
  const active = data.active_interventions;
  const review = data.students_to_review;
  const allClear = due.total === 0 && review === 0 && active.interventions === 0;

  return (
    <section aria-label="Today" className="mt-4">
      <h3 className="text-sm font-semibold uppercase tracking-wide text-gray-500">Today</h3>
      {allClear && (
        <div className="mt-3 rounded-lg border border-green-200 bg-green-50 p-4">
          <p className="text-sm text-green-800">
            Nothing needs your attention right now. Follow-ups, students to review and active interventions will show here.
          </p>
        </div>
      )}
      <div className="mt-3 grid gap-4 sm:grid-cols-3">
        <Card
          title="Follow-ups due"
          value={due.total}
          label={'Follow-ups due: ' + due.total + '. Open the To do list.'}
          lines={[
            { text: plural(due.interventions, 'intervention', 'interventions') + ', ' + plural(due.parent_contacts, 'parent contact', 'parent contacts') },
            due.overdue > 0 ? { text: due.overdue + ' overdue', warn: true } : { text: 'None overdue' },
          ]}
          icon={
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
            </svg>
          }
          iconBg="bg-blue-500"
        />
        <Card
          title="Students to review"
          value={review}
          label={'Students to review: ' + review + '. Open the To do list.'}
          lines={[{ text: review > 0 ? 'Needs review' : 'No one needs review' }]}
          icon={
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
            </svg>
          }
          iconBg="bg-purple-500"
        />
        <Card
          title="Active interventions"
          value={active.interventions}
          label={'Active interventions: ' + active.interventions + '. Open the To do list.'}
          lines={[
            { text: plural(active.students, 'student', 'students') },
            { text: active.with_follow_up_due + ' with a follow-up due', warn: active.with_follow_up_due > 0 },
          ]}
          icon={
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          }
          iconBg="bg-amber-500"
        />
      </div>
    </section>
  );
}
