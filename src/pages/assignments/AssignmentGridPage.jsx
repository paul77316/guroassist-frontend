import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import AssignmentFormModal from './AssignmentFormModal';
import { StatusBadge } from '../../components/ui/statusStyles';
import { useAssignment, useSaveSubmissions } from '../../hooks/useAssignments';
import { firstError } from '../../utils/errors';
import { prettyDate, todayLocal } from '../../utils/dates';

const OUTCOMES = [
  ['clear', 'No record'],
  ['submitted', 'Submitted'],
  ['excused', 'Excused'],
];

// what the server has -> the values shown in the row
const fromServer = (s) => ({
  outcome: s.status === 'submitted' || s.status === 'late' ? 'submitted' : s.status === 'excused' ? 'excused' : 'clear',
  date: s.submitted_date ?? '',
  feedback: s.feedback ?? '',
});

// only what the server cares about, so "unchanged" can be compared
const normalize = (v) => ({
  outcome: v.outcome,
  date: v.outcome === 'submitted' ? v.date : '',
  feedback: v.outcome === 'clear' ? '' : v.feedback.trim(),
});

const toRecord = (studentId, v) => ({
  student_id: studentId,
  outcome: v.outcome,
  submitted_date: v.outcome === 'submitted' && v.date ? v.date : null, // empty = today, decided by the server
  feedback: v.outcome !== 'clear' && v.feedback.trim() ? v.feedback.trim() : null,
});

function dateProblem(v, a, today) {
  if (v.outcome !== 'submitted' || !v.date) return null;
  if (v.date > today) return 'The date cannot be in the future.';
  if (v.date < a.assigned_date) return 'The date is before the date assigned.';
  return null;
}

const inputCls = 'rounded-md border border-gray-300 px-2 py-1 text-sm';

export default function AssignmentGridPage() {
  const { id } = useParams();
  const { data, isLoading, isError, error } = useAssignment(id);
  const save = useSaveSubmissions();

  const [edits, setEdits] = useState({}); // { studentId: { outcome?, date?, feedback? } }
  const [savedCount, setSavedCount] = useState(null);
  const [editing, setEditing] = useState(false);
  const [notice, setNotice] = useState('');
  const [bulkDate, setBulkDate] = useState('');

  const today = todayLocal();
  const a = data?.assignment;
  const students = data?.students ?? [];

  const valueOf = (s) => ({ ...fromServer(s), ...edits[s.student_id] });

  // rows that differ from the server, and rows with a bad date
  const { changed, changedIds, invalidCount } = useMemo(() => {
    const rows = [];
    const ids = new Set();
    let bad = 0;
    if (a) {
      students.forEach((s) => {
        const cur = { ...fromServer(s), ...edits[s.student_id] };
        if (dateProblem(cur, a, today)) bad += 1;
        if (JSON.stringify(normalize(fromServer(s))) !== JSON.stringify(normalize(cur))) {
          rows.push(toRecord(s.student_id, cur));
          ids.add(s.student_id);
        }
      });
    }
    return { changed: rows, changedIds: ids, invalidCount: bad };
  }, [students, edits, a, today]);

  const dirty = changed.length > 0;

  // warn before closing the tab with unsaved changes
  useEffect(() => {
    if (!dirty) return;
    const handler = (e) => { e.preventDefault(); e.returnValue = ''; };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [dirty]);

  const setField = (studentId, patch) => {
    setEdits((prev) => ({ ...prev, [studentId]: { ...(prev[studentId] ?? {}), ...patch } }));
    setSavedCount(null);
  };

  // everyone without a record is marked as handed in on the chosen date
  const defaultBulk = a ? (a.due_date < today ? a.due_date : today) : '';
  const effectiveBulk = bulkDate || defaultBulk;
  const unrecorded = students.filter((s) => valueOf(s).outcome === 'clear' && s.status !== 'not_applicable');

  const markAll = () => {
    setEdits((prev) => {
      const next = { ...prev };
      unrecorded.forEach((s) => {
        next[s.student_id] = { ...(prev[s.student_id] ?? {}), outcome: 'submitted', date: effectiveBulk };
      });
      return next;
    });
    setSavedCount(null);
  };

  const handleSave = () => {
    save.mutate(
      { id, records: changed },
      { onSuccess: (res) => { setEdits({}); setSavedCount(res.changed); } }
    );
  };

  const confirmLeave = (e) => {
    if (dirty && !window.confirm('You have unsaved changes. Leave this page?')) e.preventDefault();
  };

  if (isLoading) return <p className="text-sm text-gray-500">Loading assignment…</p>;
  if (isError || !data) {
    return (
      <div>
        <p className="text-sm text-gray-700">
          {error?.status === 404 || error?.status === 403
            ? "This assignment wasn't found, or you don't have access to it. It may have been deleted."
            : firstError(error, 'Failed to load the assignment.')}
        </p>
        <Link to="/assignments" className="mt-2 inline-block text-sm text-blue-600 hover:underline">← Back to Activities</Link>
      </div>
    );
  }

  const s = data.stats;
  const expected = s.total - s.excused;
  const chip = (label, value, cls = 'text-gray-900') => (
    <div className="rounded-md border border-gray-200 px-3 py-2 text-center">
      <p className={`text-lg font-semibold ${cls}`}>{value}</p>
      <p className="text-xs text-gray-500">{label}</p>
    </div>
  );

  return (
    <div>
      <Link
        to={`/assignments?class=${a.class_assignment_id}`}
        onClick={confirmLeave}
        className="text-sm text-blue-600 hover:underline"
      >
        ← Activities
      </Link>

      <div className="mt-2 flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-lg font-semibold text-gray-900">{a.title}</h2>
          <p className="text-sm text-gray-500">
            Assigned {prettyDate(a.assigned_date)} · Due {prettyDate(a.due_date)}
            {a.is_past_due && <span className="ml-2 rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-600">Overdue</span>}
          </p>
          {a.description && <p className="mt-1 text-sm text-gray-600">{a.description}</p>}
        </div>
        <button onClick={() => setEditing(true)} className="rounded-md border border-gray-300 px-4 py-2 text-sm hover:bg-gray-50">
          Edit assignment
        </button>
      </div>

      {notice && <p className="mt-3 rounded-md bg-blue-50 p-3 text-sm text-blue-800">{notice}</p>}

      <div className="mt-5 grid grid-cols-3 gap-2 sm:grid-cols-6">
        {chip('Submitted', s.submitted, 'text-green-700')}
        {chip('Late', s.late, 'text-amber-700')}
        {chip('Excused', s.excused, 'text-blue-700')}
        {chip('Missing', s.missing, 'text-red-700')}
        {chip('Not yet', s.not_yet)}
        {chip('Handed in', s.submission_rate != null ? `${s.submission_rate}%` : '—')}
      </div>
      <p className="mt-2 text-xs text-gray-500">
        {expected > 0 ? `${s.turned_in} of ${expected} handed in. ` : ''}
        Late work counts as handed in. Excused students are not counted.
        {s.not_applicable > 0 && ` ${s.not_applicable} joined after the due date and are not counted.`}
      </p>

      {students.length === 0 ? (
        <p className="mt-6 rounded-lg border border-dashed border-gray-300 p-8 text-center text-sm text-gray-500">
          No active students are enrolled in this class.
        </p>
      ) : (
        <>
          <div className="mt-5 flex flex-wrap items-end gap-3 rounded-lg bg-gray-50 p-3">
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-700">Mark everyone with no record as submitted on</label>
              <input
                type="date"
                value={effectiveBulk}
                min={a.assigned_date}
                max={today}
                onChange={(e) => setBulkDate(e.target.value)}
                className={inputCls}
              />
            </div>
            <button
              onClick={markAll}
              disabled={unrecorded.length === 0 || !effectiveBulk}
              className="rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm hover:bg-gray-50 disabled:opacity-50"
            >
              Apply to {unrecorded.length} {unrecorded.length === 1 ? 'student' : 'students'}
            </button>
            <p className="text-xs text-gray-500">Nothing is saved until you press Save.</p>
          </div>

          <div className="mt-4 overflow-x-auto rounded-lg border border-gray-200 bg-white">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-gray-50 text-xs uppercase text-gray-500">
                <tr>
                  <th className="px-4 py-2">Student</th>
                  <th className="px-3 py-2">Status</th>
                  <th className="px-3 py-2">Record</th>
                  <th className="px-3 py-2">Date handed in</th>
                  <th className="px-3 py-2">Private note</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {students.map((st) => {
                  const cur = valueOf(st);
                  const problem = dateProblem(cur, a, today);
                  const effective = cur.date || today;
                  return (
                    <tr key={st.student_id} className={st.status === 'not_applicable' ? 'bg-gray-50' : ''}>
                      <td className="whitespace-nowrap px-4 py-2 text-gray-900">
                        {st.full_name}
                        {st.status === 'not_applicable' && (
                          <span className="block text-xs text-gray-400">Joined after the due date</span>
                        )}
                      </td>
                      <td className="px-3 py-2">
                        <StatusBadge status={st.status} />
                        {changedIds.has(st.student_id) && <span className="ml-2 text-xs text-amber-600">unsaved</span>}
                      </td>
                      <td className="px-3 py-2">
                        <select
                          value={cur.outcome}
                          onChange={(e) => setField(st.student_id, { outcome: e.target.value })}
                          className={inputCls}
                        >
                          {OUTCOMES.map(([v, label]) => <option key={v} value={v}>{label}</option>)}
                        </select>
                      </td>
                      <td className="px-3 py-2">
                        {cur.outcome === 'submitted' ? (
                          <div>
                            <input
                              type="date"
                              value={cur.date}
                              min={a.assigned_date}
                              max={today}
                              onChange={(e) => setField(st.student_id, { date: e.target.value })}
                              className={`${inputCls} ${problem ? 'border-red-500 bg-red-50' : ''}`}
                            />
                            <p className={`mt-0.5 text-xs ${problem ? 'text-red-600' : 'text-gray-400'}`}>
                              {problem ?? (cur.date ? '' : 'Today · ') + (effective > a.due_date ? 'will be marked late' : 'on time')}
                            </p>
                          </div>
                        ) : (
                          <span className="text-gray-300">—</span>
                        )}
                      </td>
                      <td className="px-3 py-2">
                        <input
                          type="text"
                          maxLength={1000}
                          value={cur.feedback}
                          disabled={cur.outcome === 'clear'}
                          onChange={(e) => setField(st.student_id, { feedback: e.target.value })}
                          placeholder={cur.outcome === 'clear' ? '' : 'Only you and admins can see this'}
                          className={`${inputCls} w-56 disabled:bg-gray-50`}
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="mt-4 flex flex-wrap items-center justify-end gap-3">
            {save.isError && <span className="text-sm text-red-600">{firstError(save.error, 'Failed to save.')}</span>}
            {invalidCount > 0 && <span className="text-sm text-red-600">Fix the highlighted dates first.</span>}
            {dirty && invalidCount === 0 && <span className="text-sm text-amber-600">{changed.length} unsaved {changed.length === 1 ? 'change' : 'changes'}</span>}
            {savedCount !== null && !dirty && (
              <span className="text-sm text-green-600">{savedCount === 0 ? 'Nothing changed.' : `Saved ${savedCount} ${savedCount === 1 ? 'record' : 'records'}.`}</span>
            )}
            <button
              onClick={handleSave}
              disabled={save.isPending || !dirty || invalidCount > 0}
              className="rounded-md bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-700 disabled:opacity-50"
            >
              {save.isPending ? 'Saving…' : 'Save'}
            </button>
          </div>
        </>
      )}

      {editing && (
        <AssignmentFormModal
          assignment={a}
          onClose={() => setEditing(false)}
          onSaved={(result) =>
            setNotice(
              result.recalculated > 0
                ? `${result.recalculated} recorded ${result.recalculated === 1 ? 'hand-in was' : 'hand-ins were'} re-checked against the new due date.`
                : ''
            )
          }
        />
      )}
    </div>
  );
}
