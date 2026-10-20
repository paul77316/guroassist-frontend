import { useEffect, useMemo, useState } from 'react';
import { useClasses } from '../../hooks/useClasses';
import { useAttendance, useSaveAttendance } from '../../hooks/useAttendance';
import Modal from '../../components/ui/Modal';
import AttendanceTabs from '../../components/ui/AttendanceTabs';

const STATUSES = [
  { value: 'present', label: 'Present', active: 'bg-green-600 text-white border-green-600' },
  { value: 'absent', label: 'Absent', active: 'bg-red-600 text-white border-red-600' },
  { value: 'late', label: 'Late', active: 'bg-amber-500 text-white border-amber-500' },
  { value: 'excused', label: 'Excused', active: 'bg-blue-600 text-white border-blue-600' },
];

// Local date: toISOString() is UTC and can return yesterday in PH time
function todayLocal() {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export default function AttendancePage() {
  const today = todayLocal();
  const { data: classes = [], isLoading: classesLoading } = useClasses();
  const [classId, setClassId] = useState('');
  const [date, setDate] = useState(today);
  const [marks, setMarks] = useState({}); // { studentId: status }
  const [dirty, setDirty] = useState(false);
  const [saved, setSaved] = useState(false);
  const [clearing, setClearing] = useState(null); // student pending a clear confirmation

  // Default to the first class once classes load
  useEffect(() => {
    if (!classId && classes.length > 0) setClassId(String(classes[0].id));
  }, [classes, classId]);

  const { data, isLoading, isError, error } = useAttendance(classId, date);
  const save = useSaveAttendance();

  // Load saved statuses from the server when class/date/data changes
  useEffect(() => {
    if (!data) return;
    const initial = {};
    data.students.forEach((s) => {
      if (s.status) initial[s.student_id] = s.status;
    });
    setMarks(initial);
    setDirty(false);
    setSaved(false);
  }, [data]);

  // Warn before closing the tab or reloading with unsaved marks
  useEffect(() => {
    if (!dirty) return;
    const handler = (e) => {
      e.preventDefault();
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [dirty]);

  const students = data?.students ?? [];

  const counts = useMemo(() => {
    const c = { present: 0, absent: 0, late: 0, excused: 0, unmarked: 0 };
    students.forEach((s) => {
      const m = marks[s.student_id];
      if (m) c[m] += 1;
      else c.unmarked += 1;
    });
    return c;
  }, [students, marks]);

  const confirmDiscard = () =>
    !dirty || window.confirm('You have unsaved attendance changes. Discard them?');

  const changeClass = (e) => {
    if (!confirmDiscard()) return;
    setClassId(e.target.value);
  };

  const changeDate = (e) => {
    if (!e.target.value || !confirmDiscard()) return;
    setDate(e.target.value);
  };

  const setMark = (studentId, status) => {
    setMarks((prev) => ({ ...prev, [studentId]: status }));
    setDirty(true);
    setSaved(false);
  };

  const clearMark = (studentId) => {
    setMarks((prev) => {
      const next = { ...prev };
      delete next[studentId];
      return next;
    });
    setDirty(true);
    setSaved(false);
  };

  const confirmClear = () => {
    if (clearing) clearMark(clearing.student_id);
    setClearing(null);
  };

  const markAllPresent = () => {
    const all = {};
    students.forEach((s) => { all[s.student_id] = 'present'; });
    setMarks(all);
    setDirty(true);
    setSaved(false);
  };

  const handleSave = () => {
    // Send marked students, plus previously saved students who are now cleared (status: null)
    const records = students
      .filter((s) => marks[s.student_id] || s.status)
      .map((s) => ({ student_id: s.student_id, status: marks[s.student_id] ?? null }));
    if (records.length === 0) return;

    save.mutate(
      { classId, date, records },
      {
        onSuccess: () => {
          setDirty(false);
          setSaved(true);
        },
      }
    );
  };

  const serverError = save.isError
    ? Object.values(save.error?.response?.data?.errors ?? {}).flat()[0] ??
      save.error?.response?.data?.message ??
      save.error?.message ??
      'Failed to save attendance.'
    : null;

  return (
    <div>
      <h2 className="text-lg font-semibold text-gray-900">Attendance</h2>
      <p className="mt-1 text-sm text-gray-500">Mark who is present for a class on a given day.</p>
      <AttendanceTabs />
      {classesLoading ? (
        <div className="mt-6 text-sm text-gray-500">Loading classes…</div>
      ) : classes.length === 0 ? (
        <div className="mt-6 rounded-lg border border-dashed border-gray-300 p-8 text-center text-sm text-gray-500">
          You don't have any classes yet. Add one on the Classes page first.
        </div>
      ) : (
        <>
          <div className="mt-6 flex flex-wrap items-end gap-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Class</label>
              <select
                value={classId}
                onChange={changeClass}
                className="rounded-md border border-gray-300 px-3 py-2 text-sm"
              >
                {classes.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.grade_level} - {c.section} ({c.subject})
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Date</label>
              <input
                type="date"
                value={date}
                max={today}
                onChange={changeDate}
                className="rounded-md border border-gray-300 px-3 py-2 text-sm"
              />
            </div>
          </div>

          {isLoading ? (
            <div className="mt-6 text-sm text-gray-500">Loading students…</div>
          ) : isError ? (
            <div className="mt-6 text-sm text-red-600">
              {error?.response?.data?.message ?? error?.message ?? 'Failed to load attendance.'}
            </div>
          ) : students.length === 0 ? (
            <div className="mt-6 rounded-lg border border-dashed border-gray-300 p-8 text-center text-sm text-gray-500">
              No active students are enrolled in this class.
            </div>
          ) : (
            <div className="mt-6">
              <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
                <p className="text-sm text-gray-600">
                  {counts.present} present · {counts.absent} absent · {counts.late} late ·{' '}
                  {counts.excused} excused · {counts.unmarked} unmarked
                </p>
                <button
                  onClick={markAllPresent}
                  className="rounded-md border border-gray-300 px-3 py-1.5 text-sm hover:bg-gray-50"
                >
                  Mark all present
                </button>
              </div>

              <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white">
                <table className="min-w-full text-sm">
                  <thead className="bg-gray-50 text-left text-gray-600">
                    <tr>
                      <th className="px-4 py-2 font-medium">Student</th>
                      <th className="px-4 py-2 font-medium">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {students.map((s) => (
                      <tr key={s.student_id}>
                        <td className="px-4 py-2 text-gray-900">{s.full_name}</td>
                        <td className="px-4 py-2">
                          <div className="flex flex-wrap items-center gap-2">
                            {STATUSES.map((st) => {
                              const active = marks[s.student_id] === st.value;
                              return (
                                <button
                                  key={st.value}
                                  type="button"
                                  onClick={() => setMark(s.student_id, st.value)}
                                  className={`rounded-md border px-3 py-1 text-xs font-medium ${
                                    active ? st.active : 'border-gray-300 text-gray-600 hover:bg-gray-50'
                                  }`}
                                >
                                  {st.label}
                                </button>
                              );
                            })}
                            {marks[s.student_id] && (
                              <button
                                type="button"
                                onClick={() => setClearing(s)}
                                className="rounded-md px-2 py-1 text-xs text-gray-400 hover:text-red-600"
                                title="Clear this mark"
                              >
                                Clear
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="mt-4 flex items-center justify-end gap-3">
                {serverError && <span className="text-sm text-red-600">{serverError}</span>}
                {dirty && <span className="text-sm text-amber-600">Unsaved changes</span>}
                {saved && !dirty && <span className="text-sm text-green-600">Attendance saved.</span>}
                <button
                  onClick={handleSave}
                  disabled={save.isPending || !dirty}
                  className="rounded-md bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-700 disabled:opacity-50"
                >
                  {save.isPending ? 'Saving…' : 'Save attendance'}
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {clearing && (
        <Modal isOpen onClose={() => setClearing(null)} title="Clear attendance mark?">
          <p className="text-sm text-gray-600">
            Remove <span className="font-medium">{clearing.full_name}</span>'s{' '}
            <span className="font-medium">{marks[clearing.student_id]}</span> mark for this date?
            It is removed from the record when you click Save attendance.
          </p>
          <div className="mt-4 flex justify-end gap-2">
            <button
              onClick={() => setClearing(null)}
              className="rounded-md border px-4 py-2 text-sm"
            >
              Cancel
            </button>
            <button
              onClick={confirmClear}
              className="rounded-md bg-red-600 px-4 py-2 text-sm text-white hover:bg-red-700"
            >
              Clear mark
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}