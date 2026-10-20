import { useState } from 'react';
import NoteFormModal from './NoteFormModal';
import NoteDetailModal from './NoteDetailModal';
import { useStudentNotes, useRestoreNote } from '../../hooks/useStudentNotes';
import { firstError } from '../../utils/errors';
import { prettyDate } from '../../utils/dates';

/**
 * A student's private notes inside the Student View window.
 * classes: the student's classes from the profile ({ id, label, subject }).
 * List rows show a short preview; the full text is in the detail window.
 */
export default function StudentNotesTab({ studentId, classes = [] }) {
  const [showDeleted, setShowDeleted] = useState(false);
  const [creating, setCreating] = useState(false);
  const [openId, setOpenId] = useState(null);
  const [restoreError, setRestoreError] = useState('');

  const { data, isLoading, isError, error } = useStudentNotes(studentId, '', showDeleted);
  const restore = useRestoreNote();
  const rows = data ?? [];

  const onRestore = (id) => {
    setRestoreError('');
    restore.mutate(id, { onError: (err) => setRestoreError(firstError(err, 'Could not restore this note.')) });
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
            Add note
          </button>
        )}
      </div>

      {isLoading ? (
        <p className="py-6 text-center text-sm text-gray-500">Loading...</p>
      ) : isError ? (
        <p className="py-6 text-center text-sm text-red-600">{firstError(error, 'Could not load notes.')}</p>
      ) : !data ? (
        <p className="py-6 text-center text-sm text-gray-500">Loading...</p>
      ) : rows.length === 0 ? (
        <p className="mt-3 rounded-lg border border-dashed border-gray-300 p-6 text-center text-sm text-gray-500">
          {showDeleted ? 'No deleted notes.' : 'You have not added any notes for this student.'}
        </p>
      ) : (
        <ul className="mt-3 space-y-2">
          {rows.map((r) => (
            <li key={r.id} className="rounded-lg border border-gray-200 p-3">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <p className="break-words text-sm text-gray-900">{r.preview}</p>
                  <p className="mt-1 text-xs text-gray-500">
                    Added {prettyDate(r.date)}
                    {r.class ? ` - ${r.class.label}${r.class.subject ? ` (${r.class.subject})` : ''}` : ' - General'}
                    {r.author ? ` - by ${r.author}` : ''}
                  </p>
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
        Notes are private to the teacher who wrote them and to administrators. They are reminders for your own
        use, not a record of the student&apos;s standing.
      </p>

      {creating && <NoteFormModal studentId={studentId} classes={classes} onClose={() => setCreating(false)} />}
      {openId && <NoteDetailModal id={openId} onClose={() => setOpenId(null)} />}
    </div>
  );
}
