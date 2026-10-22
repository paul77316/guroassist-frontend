import { useState } from 'react';
import Modal from './Modal';
import CommunicationFormModal from './CommunicationFormModal';
import ConfirmDialog from './ConfirmDialog';
import { FollowUpStateBadge, FollowUpActions } from './CommunicationFollowUp';
import { useParentCommunication, useDeleteCommunication } from '../../hooks/useParentCommunications';
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

/** One logged communication with its reason and summary, and the actions. Opens over the student window. */
export default function CommunicationDetailModal({ id, onClose }) {
  const { data: c, isLoading, isError, error } = useParentCommunication(id);
  const del = useDeleteCommunication();
  const [editing, setEditing] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [actionError, setActionError] = useState('');

  const onDelete = () => {
    setActionError('');
    del.mutate(c.id, {
      onSuccess: onClose,
      onError: (err) => setActionError(firstError(err, 'Could not delete this communication.')),
    });
  };

  return (
    <Modal title="Communication" onClose={onClose} maxWidth="max-w-xl">
      {isLoading ? (
        <p className="py-8 text-center text-sm text-gray-500">Loading...</p>
      ) : isError ? (
        <p className="py-8 text-center text-sm text-red-600">
          {error?.status === 403
            ? "You don't have access to this communication."
            : error?.status === 404
              ? 'This communication no longer exists.'
              : firstError(error, 'Could not load this communication.')}
        </p>
      ) : !c ? (
        <p className="py-8 text-center text-sm text-gray-500">Loading...</p>
      ) : (
        <>
          <dl>
            <Row label="Contact date">{prettyDate(c.contact_date)}</Row>
            <Row label="Method">{c.method_label}</Row>
            <Row label="Class">
              {c.class ? classText(c.class) : 'General (not tied to a class)'}
            </Row>
            <Row label="Reason">{c.reason}</Row>
            <Row label="Summary">{c.summary}</Row>
            <Row label="Follow-up date">
              {c.follow_up_date ? (
                <span className="flex flex-wrap items-center gap-2">
                  <span>{prettyDate(c.follow_up_date)}</span>
                  <FollowUpStateBadge state={c.follow_up_state} />
                </span>
              ) : null}
            </Row>
            {c.follow_up_done_at && <Row label="Marked done">{prettyDate(c.follow_up_done_at)}</Row>}
            {c.author && <Row label="Logged by">{c.author}</Row>}
          </dl>

          <div className="mt-6 flex flex-wrap items-start justify-end gap-2">
            <FollowUpActions id={c.id} state={c.follow_up_state} allowUndo />
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

          <p className="mt-3 text-right text-xs text-gray-500">
            Changing or removing the follow-up date clears the done mark.
          </p>

          {editing && <CommunicationFormModal communication={c} onClose={() => setEditing(false)} />}

          {confirmingDelete && (
            <ConfirmDialog
              title="Delete communication"
              message="Delete this communication? It will be hidden from your list, and you can restore it later from Show deleted."
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
