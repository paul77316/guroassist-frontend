import { useState } from 'react';
import Modal from '../../components/ui/Modal';
import Badge from '../../components/ui/Badge';
import GradingConfigFormModal from './GradingConfigFormModal';
import { useAdminConfigs, useAdminTerms, useDeleteConfig, useDuplicateConfig } from '../../hooks/useAdmin';
import { useGradeLevels, useSubjects, useAcademicYears } from '../../hooks/useLookups';

export default function GradingConfigsPage() {
  const { data: configs = [], isLoading, isError } = useAdminConfigs();
  const { data: terms = [] } = useAdminTerms();
  const { data: years = [] } = useAcademicYears();
  const { data: grades = [] } = useGradeLevels();
  const { data: subjects = [] } = useSubjects();
  const del = useDeleteConfig();
  const dup = useDuplicateConfig();

  const [form, setForm] = useState(null);       // { config } | {} for new
  const [toDelete, setToDelete] = useState(null);
  const [message, setMessage] = useState('');

  const nameOf = (list, id) => list.find((x) => x.id === id)?.name ?? `#${id}`;

  const duplicate = (c) => {
    setMessage('');
    dup.mutate(c.id, {
      onSuccess: (copy) => setForm({ config: copy }), // open the draft copy for editing
      onError: (err) => setMessage(err.message),
    });
  };

  const confirmDelete = () => {
    del.mutate(toDelete.id, {
      onSuccess: () => setToDelete(null),
      onError: (err) => { setToDelete(null); setMessage(err.errors?.configuration?.[0] ?? err.message); },
    });
  };

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Grading Configurations</h1>
          <p className="text-sm text-gray-500">Category weights per academic year, grade level, subject, and term.</p>
        </div>
        <button onClick={() => setForm({})} className="rounded-md bg-blue-600 px-4 py-2 text-sm text-white">
          New Configuration
        </button>
      </div>

      {message && <p className="mb-3 rounded-md bg-red-50 p-3 text-sm text-red-700">{message}</p>}
      {isLoading && <p className="text-sm text-gray-500">Loading configurations…</p>}
      {isError && <p className="text-sm text-red-600">Couldn't load configurations. Try refreshing.</p>}
      {!isLoading && !isError && configs.length === 0 && (
        <p className="rounded-md border border-dashed p-8 text-center text-sm text-gray-500">
          No grading configurations yet. Teachers can't create assessments until one is active for their class.
        </p>
      )}

      <div className="space-y-3">
        {configs.map((c) => (
          <div key={c.id} className="rounded-lg border border-gray-200 bg-white p-4">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-medium text-gray-900">{c.name}</h3>
                  <Badge kind={c.status} />
                  {c.is_locked && <Badge kind="locked">Locked</Badge>}
                </div>
                <p className="mt-1 text-sm text-gray-500">
                  {nameOf(grades, c.grade_level_id)} · {nameOf(subjects, c.subject_id)} ·{' '}
                  {nameOf(years, c.academic_year_id)} ·{' '}
                  {c.term_id ? nameOf(terms, c.term_id) : 'All terms'}
                </p>
              </div>
              <div className="space-x-3 text-sm">
                <button onClick={() => setForm({ config: c })} className="text-blue-600 hover:underline">Edit</button>
                <button onClick={() => duplicate(c)} disabled={dup.isPending}
                  className="text-blue-600 hover:underline disabled:opacity-50">Duplicate</button>
                <button onClick={() => setToDelete(c)} disabled={c.is_locked}
                  title={c.is_locked ? 'In use by assessments' : undefined}
                  className="text-red-600 hover:underline disabled:cursor-not-allowed disabled:opacity-40">
                  Delete
                </button>
              </div>
            </div>
            <p className="mt-3 text-sm text-gray-700">
              {c.components.map((x) => `${x.name} ${x.weight}%`).join(' · ')}
              <span className={`ml-2 font-medium ${c.total_weight === 100 ? 'text-green-600' : 'text-amber-600'}`}>
                (total {c.total_weight})
              </span>
            </p>
          </div>
        ))}
      </div>

      {form && <GradingConfigFormModal config={form.config} onClose={() => setForm(null)} />}

      {toDelete && (
        <Modal title="Delete configuration" onClose={() => setToDelete(null)}>
          <p className="text-sm text-gray-600">Delete <strong>{toDelete.name}</strong>? This can't be undone.</p>
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