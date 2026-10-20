import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useStudents, useArchiveStudent } from '../../hooks/useStudents';
import { useSections } from '../../hooks/useSections';
import { useGradeLevels } from '../../hooks/useLookups';
import StudentFormModal from './StudentFormModal';
import StudentProfileModal from './StudentProfileModal';
import Pagination from '../../components/ui/Pagination';

export default function StudentsList() {
  const [searchParams] = useSearchParams();
  const [sectionId, setSectionId] = useState(searchParams.get('section') ?? '');
  const [gradeLevelId, setGradeLevelId] = useState('');
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(20);
  const [editingStudent, setEditingStudent] = useState(null); // null = closed, {} = create, {...} = edit
  const [confirmArchiveId, setConfirmArchiveId] = useState(null);
  const [viewingStudent, setViewingStudent] = useState(null);

  // wait until the teacher stops typing before searching
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search.trim()), 300);
    return () => clearTimeout(t);
  }, [search]);

  const filters = {
    page,
    per_page: perPage,
    ...(debouncedSearch && { search: debouncedSearch }),
    ...(sectionId && { section_id: sectionId }),
    ...(gradeLevelId && { grade_level_id: gradeLevelId }),
  };

  const { data, isLoading, isFetching, isError, error } = useStudents(filters);
  const { data: sections } = useSections();
  const { data: gradeLevels } = useGradeLevels();
  const archiveStudent = useArchiveStudent();

  const students = data?.data ?? [];

  // if the last student on the last page is archived, step back to a page that exists
  const lastPage = data?.meta?.last_page ?? 1;
  useEffect(() => {
    if (page > lastPage) setPage(lastPage);
  }, [page, lastPage]);

  const handleConfirmArchive = async () => {
    await archiveStudent.mutateAsync(confirmArchiveId);
    setConfirmArchiveId(null);
  };

  return (
    <div>
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-900">Students</h2>
        <button
          onClick={() => setEditingStudent({})}
          className="rounded-md bg-blue-700 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-800"
        >
          Add Student
        </button>
      </div>

      <div className="mt-4 flex flex-wrap gap-3">
        <input
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          placeholder="Search by name or student ID…"
          className="w-64 rounded-md border border-gray-300 px-3 py-1.5 text-sm"
        />
        <select
          value={gradeLevelId}
          onChange={(e) => { setGradeLevelId(e.target.value); setPage(1); }}
          className="rounded-md border border-gray-300 px-3 py-1.5 text-sm"
        >
          <option value="">All grade levels</option>
          {gradeLevels?.map((g) => (
            <option key={g.id} value={g.id}>{g.name}</option>
          ))}
        </select>
        <select
          value={sectionId}
          onChange={(e) => { setSectionId(e.target.value); setPage(1); }}
          className="rounded-md border border-gray-300 px-3 py-1.5 text-sm"
        >
          <option value="">All sections</option>
          {sections?.map((s) => (
            <option key={s.id} value={s.id}>
              {s.grade_level} - {s.name}
            </option>
          ))}
        </select>
      </div>

      <div className="mt-4 overflow-hidden rounded-md border border-gray-200">
        {isLoading ? (
          <div className="p-6 text-center text-sm text-gray-500">Loading students…</div>
        ) : isError ? (
          <div className="p-6 text-center text-sm text-red-600">{error?.message ?? 'Failed to load students.'}</div>
        ) : students.length === 0 ? (
          <div className="p-6 text-center text-sm text-gray-500">No students found.</div>
        ) : (
          <table className="w-full text-left text-sm">
            <thead className="bg-gray-50 text-xs uppercase text-gray-500">
              <tr>
                <th className="px-4 py-2">Student ID</th>
                <th className="px-4 py-2">Name</th>
                <th className="px-4 py-2">Grade level</th>
                <th className="px-4 py-2">Section</th>
                <th className="px-4 py-2">Status</th>
                <th className="px-4 py-2 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {students.map((student) => (
                <tr key={student.id}>
                  <td className="px-4 py-2 text-gray-600">{student.student_id}</td>
                  <td className="px-4 py-2 font-medium text-gray-900">{student.full_name}</td>
                  <td className="px-4 py-2 text-gray-600">
                    {student.grade_level ?? '—'}
                  </td>
                  <td className="px-4 py-2 text-gray-600">
                    {student.sections?.map((s) => s.name).join(', ') || '—'}
                  </td>
                  <td className="px-4 py-2">
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs ${
                        student.status === 'active'
                          ? 'bg-green-100 text-green-700'
                          : 'bg-gray-100 text-gray-600'
                      }`}
                    >
                      {student.status}
                    </span>
                  </td>
                  <td className="px-4 py-2 text-right">
                    <button
                      onClick={() => setViewingStudent(student)}
                      className="text-xs text-blue-600 hover:underline"
                    >
                      View
                    </button>
                    <button
                      onClick={() => setEditingStudent(student)}
                      className="ml-3 text-xs text-blue-600 hover:underline"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => setConfirmArchiveId(student.id)}
                      className="ml-3 text-xs text-red-600 hover:underline"
                    >
                      Archive
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <Pagination
        meta={data?.meta}
        noun="students"
        busy={isFetching}
        onPage={setPage}
        onPerPage={(n) => { setPerPage(n); setPage(1); }}
      />

      {editingStudent !== null && (
        <StudentFormModal
          student={Object.keys(editingStudent).length ? editingStudent : null}
          onClose={() => setEditingStudent(null)}
        />
      )}

      {viewingStudent && (
        <StudentProfileModal
          student={viewingStudent}
          onClose={() => setViewingStudent(null)}
          onEdit={() => { setEditingStudent(viewingStudent); setViewingStudent(null); }}
        />
      )}

      {confirmArchiveId !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-sm rounded-lg bg-white p-6 shadow-xl">
            <p className="text-sm text-gray-800">
              Archive this student? They'll be hidden from the active roster but their records are kept.
            </p>
            <div className="mt-4 flex justify-end gap-2">
              <button
                onClick={() => setConfirmArchiveId(null)}
                className="rounded-md px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-100"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmArchive}
                disabled={archiveStudent.isPending}
                className="rounded-md bg-red-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-60"
              >
                {archiveStudent.isPending ? 'Archiving…' : 'Archive'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
