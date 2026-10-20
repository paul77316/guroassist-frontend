import { useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import Modal from '../../components/ui/Modal';
import { useClasses } from '../../hooks/useClasses';
import { useAttendance } from '../../hooks/useAttendance';
import { useClassStudents, useRemoveStudent } from '../../hooks/useClassStudents';
import AddStudentsModal from './AddStudentsModal';
import ImportStudentsModal from './ImportStudentsModal';
import { downloadRoster } from '../../services/classService';
import { saveBlob } from '../../utils/download';

// Local date: toISOString() is UTC and can return yesterday in PH time
function todayLocal() {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export default function ClassDetailPage() {
  const { id } = useParams();
  const { data: classes = [], isLoading: classesLoading } = useClasses();
  const cls = classes.find((c) => String(c.id) === id);

  const { data: students = [], isLoading, isError, error } = useClassStudents(id);
  const { data: att } = useAttendance(id, todayLocal());
  const remove = useRemoveStudent(id);

  const [adding, setAdding] = useState(false);
  const [removing, setRemoving] = useState(null);
  const [removeError, setRemoveError] = useState('');
  const [importing, setImporting] = useState(false);
  const [exportError, setExportError] = useState('');
  const today = useMemo(() => {
    const c = { present: 0, absent: 0, late: 0, excused: 0, unmarked: 0 };
    (att?.students ?? []).forEach((s) => {
      if (s.status) c[s.status] += 1;
      else c.unmarked += 1;
    });
    return c;
  }, [att]);

  const confirmRemove = () => {
    setRemoveError('');
    remove.mutate(removing.id, {
      onSuccess: () => setRemoving(null),
      onError: (e) => setRemoveError(e?.errors?.student?.[0] ?? e?.message ?? 'Could not remove the student.'),
    });
  };

  if (classesLoading) return <p className="text-sm text-gray-500">Loading class…</p>;
  if (!cls) {
    return (
      <div>
        <p className="text-sm text-gray-600">Class not found.</p>
        <Link to="/classes" className="text-sm text-blue-600 hover:underline">← Back to My Classes</Link>
      </div>
    );
  }
  const exportRoster = async () => {
    setExportError('');
    try {
      const blob = await downloadRoster(id);
      const safe = `${cls.grade_level}-${cls.section}-${cls.subject}`.replace(/[^a-z0-9]+/gi, '_');
      saveBlob(blob, `roster_${safe}.csv`);
    } catch {
      setExportError('Could not export the roster. Please try again.');
    }
  };
  const stat = (label, value) => (
    <div className="rounded-lg border border-gray-200 bg-white px-4 py-3">
      <p className="text-xs uppercase tracking-wide text-gray-500">{label}</p>
      <p className="mt-1 text-xl font-semibold text-gray-900">{value}</p>
    </div>
  );

  return (
    <div>
      <Link to="/classes" className="text-sm text-blue-600 hover:underline">← My Classes</Link>

      <div className="mt-2 flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-blue-600">{cls.subject}</p>
          <h2 className="text-lg font-semibold text-gray-900">{cls.grade_level} - {cls.section}</h2>
          <p className="text-sm text-gray-500">{cls.academic_year}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link to="/attendance" className="rounded-md border border-gray-300 px-4 py-2 text-sm hover:bg-gray-50">
            Take attendance
          </Link>
          <button onClick={exportRoster} className="rounded-md border border-gray-300 px-4 py-2 text-sm hover:bg-gray-50">
            Export CSV
          </button>
          <button onClick={() => setImporting(true)} className="rounded-md border border-gray-300 px-4 py-2 text-sm hover:bg-gray-50">
            Import CSV
          </button>
          <button onClick={() => setAdding(true)} className="rounded-md bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-700">
            Add students
          </button>
        </div>
      </div>
      {exportError && <p className="mt-2 text-sm text-red-600">{exportError}</p>}   {/* <-- add this line */}
      <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {stat('Students', students.length)}
        {stat('Present today', today.present)}
        {stat('Absent today', today.absent)}
        {stat('Late today', today.late)}
        {stat('Excused today', today.excused)}
        {stat('Not yet marked', today.unmarked)}
      </div>

      <div className="mt-6 overflow-hidden rounded-lg border border-gray-200 bg-white">
        {isLoading ? (
          <p className="p-6 text-center text-sm text-gray-500">Loading students…</p>
        ) : isError ? (
          <p className="p-6 text-center text-sm text-red-600">{error?.message ?? 'Failed to load students.'}</p>
        ) : students.length === 0 ? (
          <p className="p-8 text-center text-sm text-gray-500">
            No students in this class yet. Use Add students to build the roster.
          </p>
        ) : (
          <table className="w-full text-left text-sm">
            <thead className="bg-gray-50 text-xs uppercase text-gray-500">
              <tr>
                <th className="px-4 py-2">Student ID</th>
                <th className="px-4 py-2">Name</th>
                <th className="px-4 py-2">Sex</th>
                <th className="px-4 py-2" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {students.map((s) => (
                <tr key={s.id}>
                  <td className="px-4 py-2 text-gray-600">{s.student_id}</td>
                  <td className="px-4 py-2 font-medium text-gray-900">{s.full_name}</td>
                  <td className="px-4 py-2 capitalize text-gray-600">{s.sex}</td>
                  <td className="px-4 py-2 text-right">
                    <button
                      onClick={() => { setRemoveError(''); setRemoving(s); }}
                      className="text-xs text-red-600 hover:underline"
                    >
                      Remove
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {adding && <AddStudentsModal cls={cls} classes={classes} onClose={() => setAdding(false)} />}
        
      {importing && <ImportStudentsModal cls={cls} onClose={() => setImporting(false)} />}   {/* <-- add this line */}

      {removing && (
        <Modal title="Remove from class?" onClose={() => setRemoving(null)}>
          <p className="text-sm text-gray-600">
            Remove <strong>{removing.full_name}</strong> from this class? The student record and their
            attendance history are kept; they just won't appear on this class's roster.
          </p>
          {removeError && <p className="mt-3 text-sm text-red-600">{removeError}</p>}
          <div className="mt-4 flex justify-end gap-2">
            <button onClick={() => setRemoving(null)} className="rounded-md border px-4 py-2 text-sm">Cancel</button>
            <button
              onClick={confirmRemove}
              disabled={remove.isPending}
              className="rounded-md bg-red-600 px-4 py-2 text-sm text-white disabled:opacity-50"
            >
              {remove.isPending ? 'Removing…' : 'Remove'}
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}