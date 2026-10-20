import { useState } from 'react';
import Modal from '../../components/ui/Modal';
import SetupFormModal from './SetupFormModal';
import { useSetupList, useDeleteSetup } from '../../hooks/useAdmin';
import { SETUP } from './setupConfigs';

const usageText = (usage) => {
  const parts = Object.entries(usage ?? {}).filter(([, n]) => n > 0).map(([label, n]) => `${n} ${label}`);
  return parts.length ? parts.join(', ') : 'Not used yet';
};

export default function SetupPage({ path }) {
  const cfg = SETUP[path];
  const { data: items = [], isLoading, isError } = useSetupList(path);
  const del = useDeleteSetup(path);
  const [form, setForm] = useState(null); // { item } | {} for new
  const [toDelete, setToDelete] = useState(null);
  const [deleteError, setDeleteError] = useState('');

  const confirmDelete = () => {
    setDeleteError('');
    del.mutate(toDelete.id, {
      onSuccess: () => setToDelete(null),
      onError: (err) => setDeleteError(err.errors?.item?.[0] ?? err.message),
    });
  };

  return (
    <div>
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">{cfg.title}</h1>
          <p className="text-sm text-gray-500">{cfg.description}</p>
        </div>
        <button onClick={() => setForm({})} className="rounded-md bg-blue-600 px-4 py-2 text-sm text-white">
          {cfg.addLabel}
        </button>
      </div>

      {isLoading && <p className="text-sm text-gray-500">Loading…</p>}
      {isError && <p className="text-sm text-red-600">Couldn't load this list. Try refreshing.</p>}
      {!isLoading && !isError && items.length === 0 && (
        <p className="rounded-md border border-dashed p-8 text-center text-sm text-gray-500">
          Nothing here yet. Use “{cfg.addLabel}” to create the first {cfg.singular}.
        </p>
      )}

      {items.length > 0 && (
        <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white">
          <table className="w-full text-left text-sm">
            <thead className="bg-gray-50 text-xs uppercase text-gray-500">
              <tr>
                {cfg.columns.map((c) => <th key={c.header} className="px-4 py-2">{c.header}</th>)}
                <th className="px-4 py-2">Used by</th>
                <th className="px-4 py-2" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {items.map((r) => (
                <tr key={r.id}>
                  {cfg.columns.map((c) => <td key={c.header} className="px-4 py-2 text-gray-600">{c.cell(r)}</td>)}
                  <td className="px-4 py-2 text-gray-500">{usageText(r.usage)}</td>
                  <td className="space-x-3 px-4 py-2 text-right">
                    <button onClick={() => setForm({ item: r })} className="text-blue-600 hover:underline">Edit</button>
                    <button
                      onClick={() => { setDeleteError(''); setToDelete(r); }}
                      disabled={r.usage_total > 0}
                      title={r.usage_total > 0 ? 'In use, so it can\'t be deleted' : undefined}
                      className="text-red-600 hover:underline disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {form && <SetupFormModal path={path} item={form.item} onClose={() => setForm(null)} />}

      {toDelete && (
        <Modal title={`Delete ${cfg.singular}`} onClose={() => setToDelete(null)}>
          <p className="text-sm text-gray-600">Delete <strong>{toDelete.name}</strong>? This can't be undone.</p>
          {deleteError && <p className="mt-3 text-sm text-red-600">{deleteError}</p>}
          <div className="mt-4 flex justify-end gap-2">
            <button onClick={() => setToDelete(null)} className="rounded-md border px-4 py-2 text-sm">Cancel</button>
            <button onClick={confirmDelete} disabled={del.isPending}
              className="rounded-md bg-red-600 px-4 py-2 text-sm text-white disabled:opacity-50">
              {del.isPending ? 'Deleting…' : 'Delete'}
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}