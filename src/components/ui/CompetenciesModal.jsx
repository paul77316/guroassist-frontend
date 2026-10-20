import { useState } from 'react';
import Modal from './Modal';
import {
  useCompetencies, useCreateCompetency, useUpdateCompetency, useDeleteCompetency,
} from '../../hooks/useExams';
import { firstError } from '../../utils/errors';

const inputCls = 'w-full rounded-md border border-gray-300 px-3 py-2 text-sm';

/** The teacher's own competency list. Questions are tagged with one; class results are grouped by it. */
export default function CompetenciesModal({ onClose }) {
  const { data, isLoading, isError, error } = useCompetencies();
  const create = useCreateCompetency();
  const update = useUpdateCompetency();
  const del = useDeleteCompetency();

  const [name, setName] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [editName, setEditName] = useState('');
  const [message, setMessage] = useState('');

  const rows = data ?? [];

  const onAdd = (e) => {
    e.preventDefault();
    const value = name.trim();
    if (!value) return;
    setMessage('');
    create.mutate(
      { name: value },
      {
        onSuccess: () => setName(''),
        onError: (err) => setMessage(firstError(err, 'Could not add the competency.')),
      }
    );
  };

  const onSaveEdit = (id) => {
    const value = editName.trim();
    if (!value) return;
    setMessage('');
    update.mutate(
      { id, name: value },
      {
        onSuccess: () => setEditingId(null),
        onError: (err) => setMessage(firstError(err, 'Could not rename the competency.')),
      }
    );
  };

  const onDelete = (c) => {
    if (!window.confirm('Delete this competency?')) return;
    setMessage('');
    del.mutate(c.id, { onError: (err) => setMessage(firstError(err, 'Could not delete the competency.')) });
  };

  return (
    <Modal title="Competencies" onClose={onClose} maxWidth="max-w-lg">
      <p className="rounded-md bg-gray-50 p-3 text-xs text-gray-600">
        A competency is a short label for what a question checks, for example &quot;Solves linear equations&quot;. Each
        question is tagged with one. This list is private to you.
      </p>

      <form onSubmit={onAdd} className="mt-4 flex gap-2">
        <input
          className={inputCls}
          value={name}
          maxLength={120}
          onChange={(e) => setName(e.target.value)}
          placeholder="New competency"
          aria-label="New competency"
        />
        <button
          type="submit"
          disabled={create.isPending || !name.trim()}
          className="shrink-0 rounded-md bg-blue-600 px-4 py-2 text-sm text-white disabled:opacity-50"
        >
          {create.isPending ? 'Adding...' : 'Add'}
        </button>
      </form>

      {message && <p className="mt-2 text-sm text-red-600">{message}</p>}

      {isLoading ? (
        <p className="py-6 text-center text-sm text-gray-500">Loading...</p>
      ) : isError ? (
        <p className="py-6 text-center text-sm text-red-600">{firstError(error, 'Could not load competencies.')}</p>
      ) : !data ? (
        <p className="py-6 text-center text-sm text-gray-500">Loading...</p>
      ) : rows.length === 0 ? (
        <p className="mt-4 rounded-lg border border-dashed border-gray-300 p-6 text-center text-sm text-gray-500">
          You have no competencies yet. Add your first one above.
        </p>
      ) : (
        <ul className="mt-4 space-y-2">
          {rows.map((c) => (
            <li key={c.id} className="rounded-lg border border-gray-200 p-3">
              {editingId === c.id ? (
                <div className="flex gap-2">
                  <input
                    className={inputCls}
                    value={editName}
                    maxLength={120}
                    onChange={(e) => setEditName(e.target.value)}
                    aria-label="Competency name"
                  />
                  <button
                    onClick={() => onSaveEdit(c.id)}
                    disabled={update.isPending || !editName.trim()}
                    className="shrink-0 rounded-md bg-blue-600 px-3 py-1.5 text-sm text-white disabled:opacity-50"
                  >
                    Save
                  </button>
                  <button onClick={() => setEditingId(null)} className="shrink-0 rounded-md border px-3 py-1.5 text-sm">
                    Cancel
                  </button>
                </div>
              ) : (
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="min-w-0">
                    <p className="break-words text-sm font-medium text-gray-900">{c.name}</p>
                    <p className="text-xs text-gray-500">
                      Used by {c.question_count ?? 0} {(c.question_count ?? 0) === 1 ? 'question' : 'questions'}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => {
                        setMessage('');
                        setEditingId(c.id);
                        setEditName(c.name);
                      }}
                      className="rounded-md border border-gray-300 px-3 py-1.5 text-sm hover:bg-gray-50"
                    >
                      Rename
                    </button>
                    <button
                      onClick={() => onDelete(c)}
                      disabled={del.isPending || (c.question_count ?? 0) > 0}
                      title={(c.question_count ?? 0) > 0 ? 'Used by questions. Change those questions first.' : undefined}
                      className="rounded-md border border-red-200 px-3 py-1.5 text-sm text-red-600 hover:bg-red-50 disabled:opacity-40"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}

      <div className="mt-6 flex justify-end">
        <button onClick={onClose} className="rounded-md border px-4 py-2 text-sm">Close</button>
      </div>
    </Modal>
  );
}