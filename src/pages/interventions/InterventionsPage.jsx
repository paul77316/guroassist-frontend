import { useEffect, useState } from 'react';
import { StatusBadge, FollowUpBadge } from '../../components/ui/InterventionBadges';
import InterventionDetailModal from '../../components/ui/InterventionDetailModal';
import InterventionFormModal from '../../components/ui/InterventionFormModal';
import { useClasses } from '../../hooks/useClasses';
import {
  useStudentsToReview, useAllInterventions, useInterventionOptions,
} from '../../hooks/useInterventions';
import { firstError } from '../../utils/errors';
import { prettyDate } from '../../utils/dates';
import DueFollowUpsSection from './DueFollowUpsSection';
import CommunicationDetailModal from '../../components/ui/CommunicationDetailModal';
import ReviewPromptsSection from './ReviewPromptsSection';
const selectCls = 'rounded-md border border-gray-300 px-3 py-2 text-sm';
const classText = (c) => `${c.grade_level} - ${c.section}${c.subject ? ` (${c.subject})` : ''}`;

const TABS = [
  { key: 'todo', label: 'To do' },
  { key: 'all', label: 'All interventions' },
];

/**
 * To do: students who match a review prompt, and follow-ups that are due.
 * All interventions: the teacher's interventions across students, e.g. the completed ones.
 */
export default function InterventionsPage() {
  const [tab, setTab] = useState('todo');
  const [openId, setOpenId] = useState(null);
  const [openCommunicationId, setOpenCommunicationId] = useState(null);
  const [starting, setStarting] = useState(null); // { studentId, classes, initial }

  return (
    <div>
      <h2 className="text-lg font-semibold text-gray-900">Interventions</h2>
      <p className="mt-1 text-sm text-gray-500">
        These are reminders and records for you, not conclusions about a student. Nothing is recorded until you start an
        intervention and save it.
      </p>

      <div className="mt-4 flex gap-1 border-b border-gray-200" role="tablist">
        {TABS.map((t) => (
          <button
            key={t.key}
            type="button"
            role="tab"
            aria-selected={tab === t.key}
            onClick={() => setTab(t.key)}
            className={`-mb-px border-b-2 px-3 py-2 text-sm font-medium ${
              tab === t.key ? 'border-blue-600 text-blue-700' : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'todo' ? (
        <>
          <ReviewPromptsSection onStart={setStarting} />
          <DueFollowUpsSection onOpenIntervention={setOpenId} onOpenCommunication={setOpenCommunicationId} />
        </>
      ) : (
        <AllSection onOpen={setOpenId} />
      )}

      {openId && <InterventionDetailModal id={openId} onClose={() => setOpenId(null)} />}
      {openCommunicationId && (
        <CommunicationDetailModal id={openCommunicationId} onClose={() => setOpenCommunicationId(null)} />
      )}
      {starting && (
        <InterventionFormModal
          studentId={starting.studentId}
          classes={starting.classes}
          initial={starting.initial}
          onClose={() => setStarting(null)}
        />
      )}
    </div>
  );
}

function ReviewSection({ onStart }) {
  const { data, isLoading, isError, error } = useStudentsToReview();
  const [type, setType] = useState('');
  const [classId, setClassId] = useState('');
  const [hideActive, setHideActive] = useState(false);

  const classes = data?.meta?.classes ?? [];

  // Filters apply to the prompts shown; a student appears only if at least one prompt matches.
  const rows = (data?.data ?? [])
    .map((s) => ({
      ...s,
      shown: s.flags.filter((f) => (!type || f.type === type) && (!classId || String(f.class.id) === classId)),
    }))
    .filter((s) => s.shown.length > 0 && (!hideActive || s.intervention.active_count === 0));

  const start = (s) => {
    const flag = s.shown[0];
    onStart({
      studentId: s.student_id,
      classes: s.classes,
      initial: {
        class_assignment_id: flag.class.id,
        concern_type: flag.type,
        concern: flag.reasons.join(' '),
      },
    });
  };

  return (
    <section className="mt-6">
      <h3 className="text-sm font-semibold uppercase tracking-wide text-gray-500">Students to review</h3>

      {isLoading ? (
        <p className="mt-4 text-sm text-gray-500">Loading...</p>
      ) : isError ? (
        <p className="mt-4 text-sm text-red-600">{firstError(error, 'Could not load the review list.')}</p>
      ) : !data ? (
        <p className="mt-4 text-sm text-gray-500">Loading...</p>
      ) : classes.length === 0 ? (
        <p className="mt-4 rounded-lg border border-dashed border-gray-300 p-8 text-center text-sm text-gray-500">
          You don't have any classes yet. Add one on the Classes page first.
        </p>
      ) : (
        <>
          <div className="mt-3 flex flex-wrap items-end gap-4">
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-600">Prompt</label>
              <select value={type} onChange={(e) => setType(e.target.value)} className={selectCls}>
                <option value="">All prompts</option>
                <option value="attendance_concern">Attendance concern</option>
                <option value="missing_work">Missing work</option>
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-600">Class</label>
              <select value={classId} onChange={(e) => setClassId(e.target.value)} className={selectCls}>
                <option value="">All classes</option>
                {classes.map((c) => <option key={c.id} value={c.id}>{classText(c)}</option>)}
              </select>
            </div>
            <label className="flex items-center gap-2 pb-2 text-sm text-gray-700">
              <input type="checkbox" checked={hideActive} onChange={(e) => setHideActive(e.target.checked)} />
              Hide students with an active intervention
            </label>
          </div>

          {rows.length === 0 ? (
            <p className="mt-4 rounded-lg border border-dashed border-gray-300 p-8 text-center text-sm text-gray-500">
              {data.data.length === 0
                ? 'No students match a review prompt right now.'
                : 'No students match these filters.'}
            </p>
          ) : (
            <div className="mt-4 overflow-x-auto rounded-lg border border-gray-200 bg-white">
              <table className="min-w-full text-left text-sm">
                <thead className="bg-gray-50 text-xs uppercase text-gray-500">
                  <tr>
                    <th className="px-4 py-2">Student</th>
                    <th className="px-4 py-2">Review prompts</th>
                    <th className="px-4 py-2">Intervention</th>
                    <th className="px-4 py-2" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {rows.map((s) => (
                    <tr key={s.student_id}>
                      <td className="whitespace-nowrap px-4 py-2 align-top">
                        <p className="font-medium text-gray-900">{s.full_name}</p>
                        <p className="text-xs text-gray-400">{s.student_number}</p>
                      </td>
                      <td className="px-4 py-2 align-top">
                        <ul className="space-y-2">
                          {s.shown.map((f, i) => (
                            <li key={`${f.type}-${f.class.id}-${i}`}>
                              <span className="inline-block rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700">
                                {f.label}
                              </span>{' '}
                              <span className="text-xs text-gray-500">{classText(f.class)}</span>
                              <ul className="mt-0.5 space-y-0.5 text-xs text-gray-500">
                                {f.reasons.map((r) => <li key={r}>{r}</li>)}
                              </ul>
                            </li>
                          ))}
                        </ul>
                      </td>
                      <td className="px-4 py-2 align-top">
                        {s.intervention.active_count > 0 ? (
                          <div className="space-y-1">
                            <span className="inline-block rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-700">
                              Intervention active
                            </span>
                            {s.intervention.follow_up_due && (
                              <span className="block text-xs text-amber-700">Follow-up due</span>
                            )}
                          </div>
                        ) : (
                          <span className="text-gray-300">-</span>
                        )}
                      </td>
                      <td className="px-4 py-2 text-right align-top">
                        <button
                          onClick={() => start(s)}
                          className="whitespace-nowrap rounded-md border border-gray-300 px-3 py-1.5 text-sm hover:bg-gray-50"
                        >
                          Start intervention
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <p className="mt-2 text-xs text-gray-500">
            Attendance is looked at over the last 30 days. Start intervention opens the
            form with the concern filled in; you can change it before saving.
          </p>
        </>
      )}
    </section>
  );
}

function DueSection({ onOpen }) {
  const { data, isLoading, isError, error } = useDueFollowUps();
  const rows = data?.data ?? [];

  return (
    <section className="mt-10">
      <h3 className="text-sm font-semibold uppercase tracking-wide text-gray-500">Follow-ups due</h3>

      {isLoading ? (
        <p className="mt-4 text-sm text-gray-500">Loading...</p>
      ) : isError ? (
        <p className="mt-4 text-sm text-red-600">{firstError(error, 'Could not load your follow-ups.')}</p>
      ) : !data ? (
        <p className="mt-4 text-sm text-gray-500">Loading...</p>
      ) : rows.length === 0 ? (
        <p className="mt-4 rounded-lg border border-dashed border-gray-300 p-8 text-center text-sm text-gray-500">
          No follow-ups are due. You are up to date.
        </p>
      ) : (
        <div className="mt-4 overflow-x-auto rounded-lg border border-gray-200 bg-white">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-gray-50 text-xs uppercase text-gray-500">
              <tr>
                <th className="px-4 py-2">Student</th>
                <th className="px-4 py-2">Class</th>
                <th className="px-4 py-2">Concern</th>
                <th className="px-4 py-2">Status</th>
                <th className="px-4 py-2">Follow-up</th>
                <th className="px-4 py-2" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {rows.map((r) => (
                <tr key={r.id} className={r.follow_up_state === 'overdue' ? 'bg-amber-50/50' : ''}>
                  <td className="whitespace-nowrap px-4 py-2">
                    <p className="font-medium text-gray-900">{r.student.full_name}</p>
                    <p className="text-xs text-gray-400">{r.student.student_number}</p>
                  </td>
                  <td className="px-4 py-2 text-gray-600">{r.class ? classText(r.class) : 'General'}</td>
                  <td className="px-4 py-2 text-gray-600">{r.concern_type_label}</td>
                  <td className="px-4 py-2"><StatusBadge status={r.status} label={r.status_label} /></td>
                  <td className="whitespace-nowrap px-4 py-2">
                    <FollowUpBadge state={r.follow_up_state} />
                    <span className="block text-xs text-gray-500">{prettyDate(r.follow_up_date)}</span>
                  </td>
                  <td className="px-4 py-2 text-right">
                    <button
                      onClick={() => onOpen(r.id)}
                      className="rounded-md border border-gray-300 px-3 py-1.5 text-sm hover:bg-gray-50"
                    >
                      Open
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <p className="mt-2 text-xs text-gray-500">
        A follow-up stays here until you complete the intervention or move its follow-up date.
        Interventions in an archived class are not shown.
      </p>
    </section>
  );
}

/** Every intervention the teacher wrote, across students, with filters. Opens the same detail window. */
function AllSection({ onOpen }) {
  const { data: classes = [] } = useClasses();
  const { data: options } = useInterventionOptions();

  const [status, setStatus] = useState('completed'); // the common question: what has been completed?
  const [classId, setClassId] = useState('');
  const [type, setType] = useState('');
  const [search, setSearch] = useState('');
  const [debounced, setDebounced] = useState('');
  const [page, setPage] = useState(1);

  // Wait for a pause in typing before asking the server, and go back to page 1 for any new filter.
  useEffect(() => {
    const t = setTimeout(() => {
      setDebounced(search.trim());
      setPage(1);
    }, 300);
    return () => clearTimeout(t);
  }, [search]);

  const change = (setter) => (e) => {
    setter(e.target.value);
    setPage(1);
  };

  const { data, isLoading, isError, error, isFetching } = useAllInterventions({
    status: status || undefined,
    class_assignment_id: classId || undefined,
    concern_type: type || undefined,
    search: debounced || undefined,
    page,
  });

  const rows = data?.data ?? [];
  const meta = data?.meta;

  const statusOptions = [
    { value: '', label: 'All statuses' },
    { value: 'active', label: 'Active (not completed)' },
    ...(options?.statuses ?? []),
  ];

  return (
    <section className="mt-6">
      <div className="flex flex-wrap items-end gap-4">
        <div>
          <label className="mb-1 block text-xs font-medium text-gray-600">Status</label>
          <select value={status} onChange={change(setStatus)} className={selectCls}>
            {statusOptions.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-gray-600">Class</label>
          <select value={classId} onChange={change(setClassId)} className={selectCls}>
            <option value="">All classes</option>
            {classes.map((c) => (
              <option key={c.id} value={c.id}>{c.grade_level} - {c.section} ({c.subject})</option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-gray-600">Concern type</label>
          <select value={type} onChange={change(setType)} className={selectCls}>
            <option value="">All types</option>
            {(options?.concern_types ?? []).map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-gray-600">Student</label>
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Name or student ID"
            className={selectCls}
          />
        </div>
      </div>

      {isLoading ? (
        <p className="mt-4 text-sm text-gray-500">Loading...</p>
      ) : isError ? (
        <p className="mt-4 text-sm text-red-600">{firstError(error, 'Could not load interventions.')}</p>
      ) : !data ? (
        <p className="mt-4 text-sm text-gray-500">Loading...</p>
      ) : rows.length === 0 ? (
        <p className="mt-4 rounded-lg border border-dashed border-gray-300 p-8 text-center text-sm text-gray-500">
          No interventions match these filters.
        </p>
      ) : (
        <>
          <p className="mt-4 text-sm text-gray-600">
            {meta?.total ?? rows.length} {(meta?.total ?? rows.length) === 1 ? 'intervention' : 'interventions'}
            {isFetching ? ' - updating...' : ''}
          </p>

          <div className="mt-2 overflow-x-auto rounded-lg border border-gray-200 bg-white">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-gray-50 text-xs uppercase text-gray-500">
                <tr>
                  <th className="px-4 py-2">Student</th>
                  <th className="px-4 py-2">Class</th>
                  <th className="px-4 py-2">Concern</th>
                  <th className="px-4 py-2">Date</th>
                  <th className="px-4 py-2">Status</th>
                  <th className="px-4 py-2" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {rows.map((r) => (
                  <tr key={r.id}>
                    <td className="whitespace-nowrap px-4 py-2">
                      <p className="font-medium text-gray-900">{r.student.full_name}</p>
                      <p className="text-xs text-gray-400">{r.student.student_number}</p>
                    </td>
                    <td className="px-4 py-2 text-gray-600">{r.class ? classText(r.class) : 'General'}</td>
                    <td className="px-4 py-2 text-gray-600">
                      {r.concern_type_label}
                      <span className="block text-xs text-gray-400">{r.intervention_type_label}</span>
                    </td>
                    <td className="whitespace-nowrap px-4 py-2 text-gray-600">{prettyDate(r.intervention_date)}</td>
                    <td className="px-4 py-2">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <StatusBadge status={r.status} label={r.status_label} />
                        <FollowUpBadge state={r.follow_up_state} />
                      </div>
                      {r.status === 'completed' && (
                        <p className="mt-1 text-xs text-gray-500">
                          {r.completed_on ? `Completed ${prettyDate(r.completed_on)}` : 'Completed'}
                          {r.outcome_label ? ` - ${r.outcome_label}` : ''}
                        </p>
                      )}
                    </td>
                    <td className="px-4 py-2 text-right">
                      <button
                        onClick={() => onOpen(r.id)}
                        className="rounded-md border border-gray-300 px-3 py-1.5 text-sm hover:bg-gray-50"
                      >
                        Open
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {meta && meta.last_page > 1 && (
            <div className="mt-3 flex items-center justify-end gap-3 text-sm text-gray-600">
              <span>Page {meta.current_page} of {meta.last_page}</span>
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={meta.current_page <= 1}
                className="rounded-md border border-gray-300 px-3 py-1.5 hover:bg-gray-50 disabled:opacity-50"
              >
                Previous
              </button>
              <button
                onClick={() => setPage((p) => Math.min(meta.last_page, p + 1))}
                disabled={meta.current_page >= meta.last_page}
                className="rounded-md border border-gray-300 px-3 py-1.5 hover:bg-gray-50 disabled:opacity-50"
              >
                Next
              </button>
            </div>
          )}
        </>
      )}

      <p className="mt-3 text-xs text-gray-500">
        Only interventions you recorded are listed, for students who are still in your classes. Open one to see the
        details and history, or to reopen a completed one. Interventions in an archived class are not shown.
      </p>
    </section>
  );
}
