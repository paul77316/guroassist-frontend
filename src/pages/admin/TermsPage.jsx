import { useState } from 'react';
import Modal from '../../components/ui/Modal';
import Badge from '../../components/ui/Badge';
import TermFormModal from './TermFormModal';
import { useAdminTerms, useDeleteTerm } from '../../hooks/useAdmin';
import { useAcademicYears } from '../../hooks/useLookups';

export default function TermsPage() {
  const { data: terms = [], isLoading, isError } = useAdminTerms();
  const { data: years = [] } = useAcademicYears();
  const del = useDeleteTerm();
  const [form, setForm] = useState(null);      // { term } | {} for new
  const [toDelete, setToDelete] = useState(null);
  const [deleteError, setDeleteError] = useState('');

  const yearName = (id) => years.find((y) => y.id === id)?.name ?? `#${id}`;

  const confirmDelete = () => {
    setDeleteError('');
    del.mutate(toDelete.id, {
      onSuccess: () => setToDelete(null),
      onError: (err) => setDeleteError(err.errors?.term?.[0] ?? err.message),
    });
  };

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Terms</h1>
          <p className="text-sm text-gray-500">Configure the terms of each academic year.</p>
        </div>
        <button onClick={() => setForm({})} className="rounded-md bg-blue-600 px-4 py-2 text-sm text-white">
          Add Term
        </button>
      </div>

      {isLoading && <p className="text-sm text-gray-500">Loading terms…</p>}
      {isError && <p className="text-sm text-red-600">Couldn't load terms. Try refreshing.</p>}
      {!isLoading && !isError && terms.length === 0 && (
        <p className="rounded-md border border-dashed p-8 text-center text-sm text-gray-500">
          No terms yet. Add the first term for an academic year.
        </p>
      )}

      {terms.length > 0 && (
        <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white">
          <table className="w-full text-left text-sm">
            <thead className="bg-gray-50 text-xs uppercase text-gray-500">
              <tr>
                <th className="px-4 py-2">Academic year</th>
                <th className="px-4 py-2">Term</th>
                <th className="px-4 py-2">Dates</th>
                <th className="px-4 py-2">Status</th>
                <th className="px-4 py-2" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {terms.map((t) => (
                <tr key={t.id}>
                  <td className="px-4 py-2">{yearName(t.academic_year_id)}</td>
                  <td className="px-4 py-2 font-medium">{t.sort_order}. {t.name}</td>
                  <td className="px-4 py-2 text-gray-600">{t.start_date} → {t.end_date}</td>
                  <td className="px-4 py-2"><Badge kind={t.status} /></td>
                  <td className="space-x-3 px-4 py-2 text-right">
                    <button onClick={() => setForm({ term: t })} className="text-blue-600 hover:underline">Edit</button>
                    <button onClick={() => { setDeleteError(''); setToDelete(t); }}
                      className="text-red-600 hover:underline">Delete</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {form && <TermFormModal term={form.term} onClose={() => setForm(null)} />}

      {toDelete && (
        <Modal title="Delete term" onClose={() => setToDelete(null)}>
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