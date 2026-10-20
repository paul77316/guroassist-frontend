import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useClasses, useArchiveClass } from '../../hooks/useClasses';
import ClassFormModal from './ClassFormModal';
import Modal from '../../components/ui/Modal';

export default function ClassesList() {
  const { data: classes, isLoading, isError, error } = useClasses();
  const archive = useArchiveClass();

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [archiving, setArchiving] = useState(null);

  const openAdd = () => {
    setEditing(null);
    setFormOpen(true);
  };
  const openEdit = (cls) => {
    setEditing(cls);
    setFormOpen(true);
  };

  return (
    <div>
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">My Classes</h2>
          <p className="mt-1 text-sm text-gray-500">
            Classes you're currently assigned to teach.
          </p>
        </div>
        <button
          onClick={openAdd}
          className="rounded-md bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-700"
        >
          + Add Class
        </button>
      </div>

      {isLoading ? (
        <div className="mt-6 text-sm text-gray-500">Loading classes…</div>
      ) : isError ? (
        <div className="mt-6 text-sm text-red-600">{error?.message ?? 'Failed to load classes.'}</div>
      ) : classes.length === 0 ? (
        <div className="mt-6 rounded-lg border border-dashed border-gray-300 p-8 text-center">
          <p className="text-sm text-gray-500">You don't have any assigned classes yet.</p>
          <button
            onClick={openAdd}
            className="mt-3 rounded-md bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-700"
          >
            Add your first class
          </button>
        </div>
      ) : (
        <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {classes.map((cls) => (
            <div
              key={cls.id}
              className="rounded-lg border border-gray-200 bg-white shadow-sm transition hover:border-blue-400 hover:shadow-md"
            >
              <Link to={`/classes/${cls.id}`} className="block p-4">
                <p className="text-xs font-medium uppercase tracking-wide text-blue-600">
                  {cls.subject}
                </p>
                <p className="mt-1 text-base font-semibold text-gray-900">
                  {cls.grade_level} - {cls.section}
                </p>
                <p className="mt-1 text-xs text-gray-400">{cls.academic_year}</p>
                <div className="mt-3 flex items-center justify-between border-t border-gray-100 pt-3">
                  <span className="text-sm text-gray-600">
                    {cls.student_count} {cls.student_count === 1 ? 'student' : 'students'}
                  </span>
                  <span className="text-xs text-blue-600">Open class →</span>
                </div>
              </Link>

              <div className="flex gap-4 border-t border-gray-100 px-4 py-2 text-sm">
                <button onClick={() => openEdit(cls)} className="text-blue-600 hover:underline">
                  Edit
                </button>
                <button onClick={() => setArchiving(cls)} className="text-red-600 hover:underline">
                  Archive
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {formOpen && (
        <ClassFormModal
            open={formOpen}
            onClose={() => setFormOpen(false)}
            classItem={editing}
        />
        )}

    {archiving && (
    <Modal isOpen onClose={() => setArchiving(null)} title="Archive class?">
        <p className="text-sm text-gray-600">
        {archiving.grade_level} - {archiving.section} ({archiving.subject}) will be hidden
        from your classes. Its attendance history is kept.
        </p>
        <div className="mt-4 flex justify-end gap-2">
        <button
            onClick={() => setArchiving(null)}
            className="rounded-md border px-4 py-2 text-sm"
        >
            Cancel
        </button>
        <button
            onClick={() => archive.mutate(archiving.id, { onSuccess: () => setArchiving(null) })}
            disabled={archive.isPending}
            className="rounded-md bg-red-600 px-4 py-2 text-sm text-white disabled:opacity-50"
        >
            {archive.isPending ? 'Archiving…' : 'Archive'}
        </button>
        </div>
    </Modal>
    )}
    </div>
  );
}