import { useState } from 'react';
import { StatusBadge, FollowUpBadge } from './InterventionBadges';
import InterventionFormModal from './InterventionFormModal';
import InterventionDetailModal from './InterventionDetailModal';
import { useInterventions, useRestoreIntervention } from '../../hooks/useInterventions';
import { firstError } from '../../utils/errors';
import { prettyDate } from '../../utils/dates';

const classText = (c) => c.label ?? `${c.grade_level} - ${c.section}${c.subject ? ` (${c.subject})` : ''}`;

const Count = ({ label, value }) => (
  <div className="rounded-md border border-gray-200 px-2 py-1.5 text-center">
    <p className="text-base font-semibold text-gray-900">{value}</p>
    <p className="text-xs text-gray-500">{label}</p>
  </div>
);

/**
 * A student's interventions inside the Student View window.
 * classes: the student's classes from the profile ({ id, label, subject }).
 * The list holds no free text; the text is in the detail window.
 */
export default function StudentInterventionsTab({ studentId, classes = [] }) {
  const [showDeleted, setShowDeleted] = useState(false);
  const [creating, setCreating] = useState(false);
  const [openId, setOpenId] = useState(null);
  const [restoreError, setRestoreError] = useState('');

  const { data, isLoading, isError, error } = useInterventions(studentId, '', showDeleted);
  const restore = useRestoreIntervention();
  const rows = data ?? [];

  const active = rows.filter((r) => r.status !== 'completed').length;
  const due = rows.filter((r) => r.follow_up_state === 'overdue' || r.follow_up_state === 'due_today').length;
  const completed = rows.filter((r) => r.status === 'completed').length;

  const onRestore = (id) => {
    setRestoreError('');
    restore.mutate(id, { onError: (err) => setRestoreError(firstError(err, 'Could not restore this intervention.')) });
  };

  return (
    <div className="mt-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <label className="flex items-center gap-2 text-sm text-gray-600">
          <input type="checkbox" checked={showDeleted} onChange={(e) => setShowDeleted(e.target.checked)} />
          Show deleted
        </label>
        {!showDeleted && (
          <button onClick={() => setCreating(true)} className="rounded-md bg-blue-600 px-3 py-1.5 text-sm text-white">
            Record intervention
          </button>
        )}
      </div>

      {!showDeleted && rows.length > 0 && (
        <div className="mt-3 grid grid-cols-3 gap-2">
          <Count label="Active" value={active} />
          <Count label="Follow-up due" value={due} />
          <Count label="Completed" value={completed} />
        </div>
      )}

      {isLoading ? (
        <p className="py-6 text-center text-sm text-gray-500">Loading...</p>
      ) : isError ? (
        <p className="py-6 text-center text-sm text-red-600">{firstError(error, 'Could not load interventions.')}</p>
      ) : !data ? (
        <p className="py-6 text-center text-sm text-gray-500">Loading...</p>
      ) : rows.length === 0 ? (
        <p className="mt-3 rounded-lg border border-dashed border-gray-300 p-6 text-center text-sm text-gray-500">
          {showDeleted ? 'No deleted interventions.' : 'You have not recorded any interventions for this student.'}
        </p>
      ) : (
        <ul className="mt-3 space-y-2">
          {rows.map((r) => (
            <li key={r.id} className="rounded-lg border border-gray-200 p-3">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-gray-900">
                    {r.concern_type_label} <span className="font-normal text-gray-500">- {r.intervention_type_label}</span>
                  </p>
                  <p className="text-xs text-gray-500">
                    {prettyDate(r.intervention_date)}
                    {r.class ? ` - ${classText(r.class)}` : ' - General'}
                    {r.author ? ` - by ${r.author}` : ''}
                  </p>
                  <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                    <StatusBadge status={r.status} label={r.status_label} />
                    <FollowUpBadge state={r.follow_up_state} />
                    {r.follow_up_date && <span className="text-xs text-gray-500">Follow-up {prettyDate(r.follow_up_date)}</span>}
                    {r.status === 'completed' && r.outcome_label && (
                      <span className="text-xs text-gray-500">Outcome: {r.outcome_label}</span>
                    )}
                  </div>
                </div>

                {showDeleted ? (
                  <button
                    onClick={() => onRestore(r.id)}
                    disabled={restore.isPending}
                    className="rounded-md border border-gray-300 px-3 py-1.5 text-sm hover:bg-gray-50 disabled:opacity-50"
                  >
                    Restore
                  </button>
                ) : (
                  <button onClick={() => setOpenId(r.id)} className="rounded-md border border-gray-300 px-3 py-1.5 text-sm hover:bg-gray-50">
                    Open
                  </button>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}

      {restoreError && <p className="mt-2 text-sm text-red-600">{restoreError}</p>}

      <p className="mt-3 text-xs text-gray-500">
        Interventions are private to the teacher who recorded them and to administrators. They are notes for your own
        follow-up, not a record of the student&apos;s standing.
      </p>

      {creating && <InterventionFormModal studentId={studentId} classes={classes} onClose={() => setCreating(false)} />}
      {openId && <InterventionDetailModal id={openId} onClose={() => setOpenId(null)} />}
    </div>
  );
}
