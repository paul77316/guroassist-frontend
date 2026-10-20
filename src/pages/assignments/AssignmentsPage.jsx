import { useState } from 'react';
import { Link } from 'react-router-dom';
import Modal from '../../components/ui/Modal';
import ClassSelect from '../../components/ui/ClassSelect';
import AssignmentTabs from '../../components/ui/AssignmentTabs';
import AssignmentFormModal from './AssignmentFormModal';
import { useSelectedClass } from '../../hooks/useSelectedClass';
import { useAssignments, useDeleteAssignment, useRestoreAssignment } from '../../hooks/useAssignments';
import { firstError } from '../../utils/errors';
import { prettyDate, todayLocal } from '../../utils/dates';

const SCOPES = [
  ['upcoming', 'Upcoming'],
  ['past', 'Past'],
  ['all', 'All'],
  ['deleted', 'Deleted'],
];

function Counts({ a }) {
  const s = a.stats;
  const expected = s.total - s.excused;
  return (
    <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
      <span className="font-medium text-gray-900">
        {expected > 0 ? `${s.turned_in} / ${expected} submitted` : 'No students to track'}
      </span>
      {s.submission_rate != null && <span className="text-gray-500">{s.submission_rate}%</span>}
      {s.late > 0 && <span className="text-amber-700">{s.late} late</span>}
      {s.missing > 0 && <span className="text-red-700">{s.missing} missing</span>}
      {s.not_yet > 0 && <span className="text-gray-500">{s.not_yet} not yet</span>}
      {s.excused > 0 && <span className="text-blue-700">{s.excused} excused</span>}
      {s.not_applicable > 0 && (<span className="text-gray-400">{s.not_applicable} not counted (added to the class after it was due)</span>)}
    </div>
  );
}

export default function AssignmentsPage() {
  const { classes, isLoading: classesLoading, classId, cls, setClassId } = useSelectedClass();
  const [scope, setScope] = useState('upcoming');
  const showDeleted = scope === 'deleted';

  const { data: items = [], isLoading, isError, error } = useAssignments(classId, showDeleted ? 'all' : scope, showDeleted);
  const del = useDeleteAssignment();
  const restore = useRestoreAssignment();

  const [form, setForm] = useState(null); // {} = new, { assignment } = edit
  const [toDelete, setToDelete] = useState(null);
  const [message, setMessage] = useState('');
  const [deleteError, setDeleteError] = useState('');
  const today = todayLocal();

  const dueLabel = (a) => {
    if (a.due_date === today) return { text: 'Due today', cls: 'bg-amber-100 text-amber-700' };
    return a.is_past_due
      ? { text: 'Overdue', cls: 'bg-gray-100 text-gray-600' }
      : { text: 'Upcoming', cls: 'bg-blue-100 text-blue-700' };
  };

  const confirmDelete = () => {
    setDeleteError('');
    del.mutate(toDelete.id, {
      onSuccess: () => { setToDelete(null); setMessage(''); },
      onError: (err) => setDeleteError(firstError(err)),
    });
  };

  const doRestore = (a) => {
    setMessage('');
    restore.mutate(a.id, { onError: (err) => setMessage(firstError(err)) });
  };

  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Activities</h2>
          <p className="mt-1 text-sm text-gray-500">
            Track who handed in what. This is for your own tracking and is not a grade.
          </p>
        </div>
        <button
          onClick={() => setForm({})}
          disabled={!classId}
          className="rounded-md bg-blue-600 px-4 py-2 text-sm text-white disabled:opacity-50"
        >
          Add Activity
        </button>
      </div>

      <AssignmentTabs classId={classId} />

      {classesLoading ? (
        <p className="mt-6 text-sm text-gray-500">Loading classes…</p>
      ) : classes.length === 0 ? (
        <p className="mt-6 rounded-lg border border-dashed border-gray-300 p-8 text-center text-sm text-gray-500">
          You don't have any classes yet. Add one on the Classes page first.
        </p>
      ) : (
        <>
          <div className="mt-6 flex flex-wrap items-end gap-4">
            <ClassSelect classes={classes} value={classId} onChange={setClassId} />
            <div className="flex gap-1.5">
              {SCOPES.map(([key, label]) => (
                <button
                  key={key}
                  onClick={() => { setScope(key); setMessage(''); }}
                  className={`rounded-full border px-3 py-1 text-xs font-medium ${
                    scope === key ? 'border-blue-600 bg-blue-600 text-white' : 'border-gray-300 text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {message && <p className="mt-4 rounded-md bg-red-50 p-3 text-sm text-red-700">{message}</p>}

          {isLoading ? (
            <p className="mt-6 text-sm text-gray-500">Loading activities…</p>
          ) : isError ? (
            <p className="mt-6 text-sm text-red-600">{firstError(error, 'Failed to load activities…</p>.')}</p>
          ) : items.length === 0 ? (
            <p className="mt-6 rounded-lg border border-dashed border-gray-300 p-8 text-center text-sm text-gray-500">
              {showDeleted
                ? 'No deleted activities…</p> for this class.'
                : scope === 'all'
                  ? 'No activities…</p> yet. Use Add assignment to create the first one.'
                  : `No ${scope} activities…</p>. Try the All tab.`}
            </p>
          ) : (
            <div className="mt-6 space-y-3">
              {items.map((a) => {
                const due = dueLabel(a);
                return (
                  <div key={a.id} className="rounded-lg border border-gray-200 bg-white p-4">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          {showDeleted ? (
                            <h3 className="font-medium text-gray-500 line-through">{a.title}</h3>
                          ) : (
                            <Link to={`/assignments/${a.id}`} className="font-medium text-gray-900 hover:text-blue-700 hover:underline">
                              {a.title}
                            </Link>
                          )}
                          {!showDeleted && (
                            <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${due.cls}`}>{due.text}</span>
                          )}
                        </div>
                        <p className="mt-0.5 text-xs text-gray-500">
                          Assigned {prettyDate(a.assigned_date)} · Due {prettyDate(a.due_date)}
                        </p>
                        {a.description && (
                          <p className="mt-1 line-clamp-2 text-sm text-gray-600">{a.description}</p>
                        )}
                      </div>

                      <div className="space-x-3 text-sm">
                        {showDeleted ? (
                          <button
                            onClick={() => doRestore(a)}
                            disabled={restore.isPending}
                            className="text-blue-600 hover:underline disabled:opacity-50"
                          >
                            Restore
                          </button>
                        ) : (
                          <>
                            <Link to={`/assignments/${a.id}`} className="text-blue-600 hover:underline">Record</Link>
                            <button onClick={() => setForm({ assignment: a })} className="text-blue-600 hover:underline">Edit</button>
                            <button
                              onClick={() => { setDeleteError(''); setToDelete(a); }}
                              className="text-red-600 hover:underline"
                            >
                              Delete
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                    {!showDeleted && <Counts a={a} />}
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      {form && (
        <AssignmentFormModal classId={classId} assignment={form.assignment} onClose={() => setForm(null)} />
      )}

      {toDelete && (
        <Modal title="Delete assignment" onClose={() => setToDelete(null)}>
          <p className="text-sm text-gray-600">
            Delete <strong>{toDelete.title}</strong>? It stops counting toward missing work. Its records are
            kept, and you can restore it from the Deleted tab.
          </p>
          {deleteError && <p className="mt-3 text-sm text-red-600">{deleteError}</p>}
          <div className="mt-4 flex justify-end gap-2">
            <button onClick={() => setToDelete(null)} className="rounded-md border px-4 py-2 text-sm">Cancel</button>
            <button
              onClick={confirmDelete}
              disabled={del.isPending}
              className="rounded-md bg-red-600 px-4 py-2 text-sm text-white disabled:opacity-50"
            >
              {del.isPending ? 'Deleting…' : 'Delete'}
            </button>
          </div>
        </Modal>
      )}

      {cls && <p className="mt-6 text-xs text-gray-400">{cls.grade_level} - {cls.section} · {cls.subject}</p>}
    </div>
  );
}
