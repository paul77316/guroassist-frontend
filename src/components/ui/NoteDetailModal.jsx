import { useState } from 'react';
import Modal from './Modal';
import NoteFormModal from './NoteFormModal';
import ConfirmDialog from './ConfirmDialog';
import { useStudentNote, useDeleteNote } from '../../hooks/useStudentNotes';
import { firstError } from '../../utils/errors';
import { prettyDate } from '../../utils/dates';

const classText = (c) => c.label ?? `${c.grade_level} - ${c.section}${c.subject ? ` (${c.subject})` : ''}`;

const Row = ({ label, children }) => (
  <div className="flex gap-3 py-1 text-sm">
    <dt className="w-28 shrink-0 text-gray-500">{label}</dt>
    <dd className="min-w-0 whitespace-pre-line break-words text-gray-900">
      {children || <span className="text-gray-400">None</span>}
    </dd>
  </div>
);

/** One note with its full text and the actions. Opens over the student window. */
export default function NoteDetailModal({ id, onClose }) {
  const { data: n, isLoading, isError, error } = useStudentNote(id);
  const del = useDeleteNote();
  const [editing, setEditing] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [actionError, setActionError] = useState('');

  const onDelete = () => {
    setActionError('');
    del.mutate(n.id, {
      onSuccess: onClose,
      onError: (err) => setActionError(firstError(err, 'Could not delete this note.')),
    });
  };

  return (
    <Modal title="Note" onClose={onClose} maxWidth="max-w-xl">
      {isLoading ? (
        <p className="py-8 text-center text-sm text-gray-500">Loading...</p>
      ) : isError ? (
        <p className="py-8 text-center text-sm text-red-600">
          {error?.status === 403
            ? "You don't have access to this note."
            : error?.status === 404
              ? 'This note no longer exists.'
              : firstError(error, 'Could not load this note.')}
        </p>
      ) : !n ? (
        <p className="py-8 text-center text-sm text-gray-500">Loading...</p>
      ) : (
        <>
          <dl>
            <Row label="Added">{prettyDate(n.date)}</Row>
            <Row label="Class">
              {n.class ? classText(n.class) : 'General (not tied to a class)'}
            </Row>
            {n.author && <Row label="Written by">{n.author}</Row>}
          </dl>

          <h4 className="mt-4 border-b border-gray-200 pb-1 text-xs font-semibold uppercase tracking-wide text-gray-500">
            Note
          </h4>
          <p className="mt-2 whitespace-pre-line break-words text-sm text-gray-900">{n.body}</p>

          <div className="mt-6 flex flex-wrap justify-end gap-2">
            <button
              onClick={() => {
                setActionError('');
                setConfirmingDelete(true);
              }}
              disabled={del.isPending}
              className="rounded-md border border-red-200 px-4 py-2 text-sm text-red-600 hover:bg-red-50 disabled:opacity-50"
            >
              {del.isPending ? 'Deleting...' : 'Delete'}
            </button>
            <button onClick={() => setEditing(true)} className="rounded-md bg-blue-600 px-4 py-2 text-sm text-white">
              Edit
            </button>
          </div>

          {editing && <NoteFormModal note={n} onClose={() => setEditing(false)} />}

          {confirmingDelete && (
            <ConfirmDialog
              title="Delete note"
              message="Delete this note? It will be hidden from your list, and you can restore it later from Show deleted."
              confirmLabel="Delete"
              pendingLabel="Deleting..."
              pending={del.isPending}
              error={actionError}
              onConfirm={onDelete}
              onCancel={() => setConfirmingDelete(false)}
            />
          )}
        </>
      )}
    </Modal>
  );
}
