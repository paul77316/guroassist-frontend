import { useEffect, useState } from 'react';
import Modal from '../../components/ui/Modal';
import { useCandidates, useEnrollStudents } from '../../hooks/useClassStudents';

const firstError = (err) =>
  Object.values(err?.errors ?? {}).flat()[0] ?? err?.message ?? 'Something went wrong.';

export default function AddStudentsModal({ cls, classes, onClose }) {
  const [search, setSearch] = useState('');
  const [debounced, setDebounced] = useState('');
  const [selected, setSelected] = useState([]);
  const [copyFrom, setCopyFrom] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    const t = setTimeout(() => setDebounced(search.trim()), 300);
    return () => clearTimeout(t);
  }, [search]);

  const { data: candidates = [], isLoading } = useCandidates(cls.id, debounced);
  const enroll = useEnrollStudents(cls.id);

  // copy only works within the same academic year
  const others = classes.filter((c) => c.id !== cls.id && c.academic_year_id === cls.academic_year_id);

  const toggle = (id) =>
    setSelected((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]));

  const run = (payload) => {
    setError('');
    enroll.mutate(payload, { onSuccess: onClose, onError: (e) => setError(firstError(e)) });
  };

  return (
    <Modal title="Add students" onClose={onClose} maxWidth="max-w-lg">
      <input
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Search by name or student ID…"
        className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
      />

      <div className="mt-3 max-h-64 overflow-y-auto rounded-md border border-gray-200">
        {isLoading ? (
          <p className="p-4 text-sm text-gray-500">Loading…</p>
        ) : candidates.length === 0 ? (
          <p className="p-4 text-sm text-gray-500">
            No students to add. You can add students from your other classes who are in the same grade level
            as this class. For a brand-new student, use Students → Add Student and pick this class.
          </p>
        ) : (
          <ul className="divide-y divide-gray-100">
            {candidates.map((s) => (
              <li key={s.id}>
                <label className="flex cursor-pointer items-center gap-3 px-3 py-2 text-sm hover:bg-gray-50">
                  <input type="checkbox" checked={selected.includes(s.id)} onChange={() => toggle(s.id)} />
                  <span className="font-medium text-gray-900">{s.full_name}</span>
                  <span className="text-xs text-gray-400">{s.student_id}</span>
                </label>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="mt-3 flex items-center justify-between">
        <span className="text-sm text-gray-500">{selected.length} selected</span>
        <button
          onClick={() => run({ student_ids: selected })}
          disabled={enroll.isPending || selected.length === 0}
          className="rounded-md bg-blue-600 px-4 py-2 text-sm text-white disabled:opacity-50"
        >
          {enroll.isPending ? 'Adding…' : 'Add selected'}
        </button>
      </div>

      {others.length > 0 && (
        <div className="mt-5 border-t border-gray-100 pt-4">
          <p className="text-sm font-medium text-gray-700">Or copy a whole class roster</p>
          <div className="mt-2 flex gap-2">
            <select
              value={copyFrom}
              onChange={(e) => setCopyFrom(e.target.value)}
              className="min-w-0 flex-1 rounded-md border border-gray-300 px-3 py-2 text-sm"
            >
              <option value="">Select a class</option>
              {others.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.grade_level} - {c.section} ({c.subject})
                </option>
              ))}
            </select>
            <button
              onClick={() => run({ copy_from_class_assignment_id: Number(copyFrom) })}
              disabled={enroll.isPending || !copyFrom}
              className="rounded-md border border-gray-300 px-3 py-2 text-sm hover:bg-gray-50 disabled:opacity-50"
            >
              Copy
            </button>
          </div>
        </div>
      )}

      {error && <p className="mt-3 text-sm text-red-600">{error}</p>}

      <div className="mt-4 flex justify-end">
        <button onClick={onClose} className="rounded-md border px-4 py-2 text-sm">Close</button>
      </div>
    </Modal>
  );
}