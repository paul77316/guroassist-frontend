import { useState } from 'react';
import { useMarkFollowUpDone, useUndoFollowUpDone } from '../../hooks/useParentCommunications';
import { firstError } from '../../utils/errors';

// Neutral wording only. The state comes from the server (follow_up_state), never from the browser clock.
const STATES = {
  done: { label: 'Done', cls: 'bg-green-50 text-green-700' },
  overdue: { label: 'Overdue', cls: 'bg-amber-50 text-amber-700' },
  due_today: { label: 'Due today', cls: 'bg-blue-50 text-blue-700' },
  upcoming: { label: 'Upcoming', cls: 'bg-gray-100 text-gray-600' },
};

const OPEN_STATES = ['overdue', 'due_today', 'upcoming'];

export function FollowUpStateBadge({ state }) {
  const s = STATES[state];
  if (!s) return null;

  return <span className={`inline-block rounded-full px-2 py-0.5 text-xs ${s.cls}`}>{s.label}</span>;
}

/**
 * Mark done (when the follow-up is still open) and, with allowUndo, Undo (when it is done).
 * Renders nothing when there is no follow-up date. The server stamps the date.
 */
export function FollowUpActions({ id, state, allowUndo = false }) {
  const mark = useMarkFollowUpDone();
  const undo = useUndoFollowUpDone();
  const [error, setError] = useState('');
  const pending = mark.isPending || undo.isPending;

  const canMark = OPEN_STATES.includes(state);
  const canUndo = allowUndo && state === 'done';
  if (!canMark && !canUndo) return null;

  const run = (mutation, fallback) => {
    setError('');
    mutation.mutate(id, { onError: (err) => setError(firstError(err, fallback)) });
  };

  return (
    <div className="flex flex-col items-start gap-1">
      {canMark && (
        <button
          type="button"
          onClick={() => run(mark, 'Could not mark this follow-up as done.')}
          disabled={pending}
          className="rounded-md border border-gray-300 px-3 py-1.5 text-sm hover:bg-gray-50 disabled:opacity-50"
        >
          {mark.isPending ? 'Saving...' : 'Mark done'}
        </button>
      )}
      {canUndo && (
        <button
          type="button"
          onClick={() => run(undo, 'Could not undo this.')}
          disabled={pending}
          className="rounded-md border border-gray-300 px-3 py-1.5 text-sm hover:bg-gray-50 disabled:opacity-50"
        >
          {undo.isPending ? 'Saving...' : 'Undo done'}
        </button>
      )}
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  );
}
