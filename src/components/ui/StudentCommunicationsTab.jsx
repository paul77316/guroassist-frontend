import { useState } from 'react';
import CommunicationFormModal from './CommunicationFormModal';
import CommunicationDetailModal from './CommunicationDetailModal';
import { FollowUpStateBadge, FollowUpActions } from './CommunicationFollowUp';
import { useParentCommunications, useRestoreCommunication } from '../../hooks/useParentCommunications';
import { firstError } from '../../utils/errors';
import { prettyDate } from '../../utils/dates';

/**
 * A student's logged contact with parents or guardians inside the Student View window.
 * classes: the student's classes from the profile ({ id, label, subject }).
 * This only records contact that already happened. The list holds no reason or summary text;
 * that text is in the detail window.
 */
export default function StudentCommunicationsTab({ studentId, classes = [] }) {
  const [showDeleted, setShowDeleted] = useState(false);
  const [creating, setCreating] = useState(false);
  const [openId, setOpenId] = useState(null);
  const [restoreError, setRestoreError] = useState('');

  const { data, isLoading, isError, error } = useParentCommunications(studentId, '', showDeleted);
  const restore = useRestoreCommunication();
  const rows = data ?? [];

  const onRestore = (id) => {
    setRestoreError('');
    restore.mutate(id, { onError: (err) => setRestoreError(firstError(err, 'Could not restore this communication.')) });
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
            Log communication
          </button>
        )}
      </div>

      {isLoading ? (
        <p className="py-6 text-center text-sm text-gray-500">Loading...</p>
      ) : isError ? (
        <p className="py-6 text-center text-sm text-red-600">{firstError(error, 'Could not load communications.')}</p>
      ) : !data ? (
        <p className="py-6 text-center text-sm text-gray-500">Loading...</p>
      ) : rows.length === 0 ? (
        <p className="mt-3 rounded-lg border border-dashed border-gray-300 p-6 text-center text-sm text-gray-500">
          {showDeleted ? 'No deleted communications.' : 'You have not logged any contact with this student\'s parent or guardian.'}
        </p>
      ) : (
        <ul className="mt-3 space-y-2">
          {rows.map((r) => (
            <li key={r.id} className="rounded-lg border border-gray-200 p-3">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-gray-900">{r.method_label}</p>
                  <p className="text-xs text-gray-500">
                    {prettyDate(r.contact_date)}
                    {r.class ? ` - ${r.class.label}${r.class.subject ? ` (${r.class.subject})` : ''}` : ' - General'}
                    {r.author ? ` - by ${r.author}` : ''}
                  </p>
                  {r.follow_up_date && (
                    <p className="mt-1 flex flex-wrap items-center gap-2 text-xs text-gray-500">
                      <span>Follow-up {prettyDate(r.follow_up_date)}</span>
                      {!showDeleted && <FollowUpStateBadge state={r.follow_up_state} />}
                    </p>
                  )}
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
                  <div className="flex items-start gap-2">
                    <FollowUpActions id={r.id} state={r.follow_up_state} />
                    <button onClick={() => setOpenId(r.id)} className="rounded-md border border-gray-300 px-3 py-1.5 text-sm hover:bg-gray-50">
                      Open
                    </button>
                  </div>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}

      {restoreError && <p className="mt-2 text-sm text-red-600">{restoreError}</p>}

      <p className="mt-3 text-xs text-gray-500">
        This log is private to the teacher who wrote it and to administrators. It records contact that already
        happened and sends nothing to anyone.
      </p>

      {creating && <CommunicationFormModal studentId={studentId} classes={classes} onClose={() => setCreating(false)} />}
      {openId && <CommunicationDetailModal id={openId} onClose={() => setOpenId(null)} />}
    </div>
  );
}
