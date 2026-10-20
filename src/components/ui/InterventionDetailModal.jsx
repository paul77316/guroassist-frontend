import { useState } from 'react';
import Modal from './Modal';
import { StatusBadge, FollowUpBadge, ENTRY_LABELS } from './InterventionBadges';
import InterventionFormModal from './InterventionFormModal';
import FollowUpFormModal from './FollowUpFormModal';
import ConfirmDialog from './ConfirmDialog';
import { useIntervention, useDeleteIntervention } from '../../hooks/useInterventions';
import { firstError } from '../../utils/errors';
import { prettyDate } from '../../utils/dates';

const Row = ({ label, children }) => (
  <div className="flex gap-3 py-1 text-sm">
    <dt className="w-36 shrink-0 text-gray-500">{label}</dt>
    <dd className="min-w-0 whitespace-pre-line break-words text-gray-900">
      {children || <span className="text-gray-400">None</span>}
    </dd>
  </div>
);

/** One intervention: details, follow-up history, and the actions. Opens over the student window. */
export default function InterventionDetailModal({ id, onClose }) {
  const { data: i, isLoading, isError, error } = useIntervention(id);
  const del = useDeleteIntervention();
  const [editing, setEditing] = useState(false);
  const [following, setFollowing] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [actionError, setActionError] = useState('');

  const onDelete = () => {
    setActionError('');
    del.mutate(i.id, {
      onSuccess: onClose,
      onError: (err) => setActionError(firstError(err, 'Could not delete this intervention.')),
    });
  };

  const history = [...(i?.followups ?? [])].reverse(); // newest first
  const isCompleted = i?.status === 'completed';

  return (
    <Modal title="Intervention" onClose={onClose} maxWidth="max-w-xl">
      {isLoading ? (
        <p className="py-8 text-center text-sm text-gray-500">Loading...</p>
      ) : isError ? (
        <p className="py-8 text-center text-sm text-red-600">
          {error?.status === 403
            ? "You don't have access to this intervention."
            : error?.status === 404
              ? 'This intervention no longer exists.'
              : firstError(error, 'Could not load this intervention.')}
        </p>
      ) : !i ? (
        <p className="py-8 text-center text-sm text-gray-500">Loading...</p>
      ) : (
        <>
          <div className="flex flex-wrap items-center gap-2">
            <StatusBadge status={i.status} label={i.status_label} />
            <FollowUpBadge state={i.follow_up_state} />
            {i.student && <span className="text-sm text-gray-600">{i.student.full_name}</span>}
          </div>

          <dl className="mt-3">
            <Row label="Concern type">{i.concern_type_label}</Row>
            <Row label="Concern">{i.concern}</Row>
            <Row label="Intervention">{i.intervention_type_label}</Row>
            <Row label="Date">{prettyDate(i.intervention_date)}</Row>
            <Row label="Class">{i.class ? `${i.class.label} - ${i.class.subject ?? ''}` : 'General (not tied to a class)'}</Row>
            <Row label="Next follow-up">{i.follow_up_date ? prettyDate(i.follow_up_date) : null}</Row>
            {isCompleted && <Row label="Outcome">{i.outcome_label}</Row>}
            <Row label="Notes">{i.notes}</Row>
            {i.author && <Row label="Recorded by">{i.author}</Row>}
          </dl>

          <h4 className="mt-5 border-b border-gray-200 pb-1 text-xs font-semibold uppercase tracking-wide text-gray-500">
            Follow-up history
          </h4>
          {history.length === 0 ? (
            <p className="py-3 text-sm text-gray-500">No follow-ups recorded yet.</p>
          ) : (
            <ol className="mt-2 space-y-3">
              {history.map((h) => (
                <li key={h.id} className="rounded-md border border-gray-200 p-3 text-sm">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-medium text-gray-900">{ENTRY_LABELS[h.entry_type] ?? h.entry_type}</span>
                    <span className="text-xs text-gray-500">{prettyDate(h.followup_date)}</span>
                    {h.from_status !== h.to_status && (
                      <span className="text-xs text-gray-500">
                        {h.from_status_label} to {h.to_status_label}
                      </span>
                    )}
                  </div>
                  {h.outcome_label && <p className="mt-1 text-xs font-medium text-gray-700">Outcome: {h.outcome_label}</p>}
                  {h.progress && <p className="mt-1 whitespace-pre-line break-words text-gray-700">{h.progress}</p>}
                  {h.notes && <p className="mt-1 whitespace-pre-line break-words text-xs text-gray-500">{h.notes}</p>}
                  {h.next_follow_up_date && (
                    <p className="mt-1 text-xs text-gray-500">Next follow-up: {prettyDate(h.next_follow_up_date)}</p>
                  )}
                </li>
              ))}
            </ol>
          )}

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
            <button onClick={() => setEditing(true)} className="rounded-md border border-gray-300 px-4 py-2 text-sm hover:bg-gray-50">
              Edit
            </button>
            <button onClick={() => setFollowing(true)} className="rounded-md bg-blue-600 px-4 py-2 text-sm text-white">
              {isCompleted ? 'Reopen' : 'Record follow-up'}
            </button>
          </div>

          {editing && <InterventionFormModal intervention={i} onClose={() => setEditing(false)} />}
          {following && <FollowUpFormModal intervention={i} onClose={() => setFollowing(false)} />}

          {confirmingDelete && (
            <ConfirmDialog
              title="Delete intervention"
              message="Delete this intervention? It will be hidden from your lists. Its follow-up history is kept, and you can restore it later."
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
