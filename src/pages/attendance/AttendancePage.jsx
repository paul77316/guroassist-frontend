import { useContext, useEffect, useState } from 'react';
import { AuthContext } from '../../contexts/AuthContext';
import { useClasses } from '../../hooks/useClasses';
import { useAttendance, useCorrectAttendance } from '../../hooks/useAttendance';
import Modal from '../../components/ui/Modal';
import AttendanceTabs from '../../components/ui/AttendanceTabs';
import { firstError } from '../../utils/errors';

const STATUSES = [
  { value: 'present', label: 'Present', badge: 'bg-green-100 text-green-800' },
  { value: 'absent', label: 'Absent', badge: 'bg-red-100 text-red-800' },
  { value: 'late', label: 'Late', badge: 'bg-amber-100 text-amber-800' },
  { value: 'excused', label: 'Excused', badge: 'bg-blue-100 text-blue-800' },
];
const BADGE = Object.fromEntries(STATUSES.map((s) => [s.value, s]));

// Local date: toISOString() is UTC and can return yesterday in PH time
function todayLocal() {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export default function AttendancePage() {
  const today = todayLocal();
  const { user } = useContext(AuthContext);
  const isAdmin = user?.role === 'admin';
  const { data: classes = [], isLoading: classesLoading } = useClasses();
  const [classId, setClassId] = useState('');
  const [date, setDate] = useState(today);
  const [correcting, setCorrecting] = useState(null); // student being corrected
  const [status, setStatus] = useState('present');
  const [reason, setReason] = useState('');
  const [notice, setNotice] = useState(null);
  const correct = useCorrectAttendance();

  useEffect(() => {
    if (!classId && classes.length > 0) setClassId(String(classes[0].id));
  }, [classes, classId]);

  const { data, isLoading, isError, error } = useAttendance(classId, date, { poll: !correcting });
  const students = data?.students ?? [];

  const counts = { present: 0, absent: 0, late: 0, excused: 0, unmarked: 0 };
  students.forEach((s) => { counts[s.status ?? 'unmarked'] += 1; });

  const startCorrection = (student) => {
    setCorrecting(student);
    setStatus(student.status ?? 'present');
    setReason('');
    setNotice(null);
    correct.reset();
  };

  const submitCorrection = (event) => {
    event.preventDefault();
    correct.mutate(
      { classId: Number(classId), studentId: correcting.student_id, date, status, reason, version: correcting.version },
      {
        onSuccess: () => {
          setCorrecting(null);
          setNotice('Correction saved. Phones that still hold the old mark will ask the teacher to resolve a conflict.');
        },
      },
    );
  };

  const correctionError = correct.isError
    ? (correct.error?.code === 'stale_version'
      ? 'This mark changed while you were editing. The list was refreshed. Close this window and review it again.'
      : firstError(correct.error, 'Could not save the correction.'))
    : null;

  return (
    <div>
      <h2 className="text-lg font-semibold text-gray-900">Attendance</h2>
      <p className="mt-1 text-sm text-gray-500">
        Attendance is taken in the GuroAssist mobile app. This page shows what the server has confirmed
        {isAdmin ? ', and lets an administrator correct a mark.' : '.'}
      </p>
      <AttendanceTabs />

      {notice && <p role="status" className="mt-4 rounded-md border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800">{notice}</p>}

      {classesLoading ? (
        <div className="mt-6 text-sm text-gray-500">Loading classes…</div>
      ) : classes.length === 0 ? (
        <div className="mt-6 rounded-lg border border-dashed border-gray-300 p-8 text-center text-sm text-gray-500">
          No classes yet. Add one on the Classes page first.
        </div>
      ) : (
        <>
          <div className="mt-6 flex flex-wrap items-end gap-4">
            <div>
              <label htmlFor="att-class" className="mb-1 block text-sm font-medium text-gray-700">Class</label>
              <select id="att-class" value={classId} onChange={(e) => setClassId(e.target.value)} className="rounded-md border border-gray-300 px-3 py-2 text-sm">
                {classes.map((c) => (
                  <option key={c.id} value={c.id}>{c.grade_level} - {c.section} ({c.subject})</option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="att-date" className="mb-1 block text-sm font-medium text-gray-700">Date</label>
              <input id="att-date" type="date" value={date} max={today} onChange={(e) => e.target.value && setDate(e.target.value)} className="rounded-md border border-gray-300 px-3 py-2 text-sm" />
            </div>
          </div>
          <p className="mt-2 text-xs text-gray-500">This view checks for mobile attendance syncs every 30 seconds while open.</p>

          {isLoading ? (
            <div className="mt-6 text-sm text-gray-500">Loading students…</div>
          ) : isError ? (
            <div className="mt-6 text-sm text-red-600">{error?.message ?? 'Failed to load attendance.'}</div>
          ) : students.length === 0 ? (
            <div className="mt-6 rounded-lg border border-dashed border-gray-300 p-8 text-center text-sm text-gray-500">
              No active students are enrolled in this class.
            </div>
          ) : (
            <div className="mt-6">
              <p className="mb-3 text-sm text-gray-600">
                {counts.present} present · {counts.absent} absent · {counts.late} late · {counts.excused} excused · {counts.unmarked} not marked
              </p>
              <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white">
                <table className="min-w-full text-sm">
                  <thead className="bg-gray-50 text-left text-gray-600">
                    <tr>
                      <th className="px-4 py-2 font-medium">Student</th>
                      <th className="px-4 py-2 font-medium">Status</th>
                      {isAdmin && <th className="px-4 py-2 text-right font-medium">Action</th>}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {students.map((s) => (
                      <tr key={s.student_id}>
                        <td className="px-4 py-2 text-gray-900">{s.full_name}</td>
                        <td className="px-4 py-2">
                          {s.status ? (
                            <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${BADGE[s.status].badge}`}>{BADGE[s.status].label}</span>
                          ) : (
                            <span className="text-gray-400">Not marked</span>
                          )}
                          {s.remarks && <span className="ml-2 text-xs text-gray-500">{s.remarks}</span>}
                        </td>
                        {isAdmin && (
                          <td className="px-4 py-2 text-right">
                            <button onClick={() => startCorrection(s)} className="text-blue-600 hover:underline">Correct</button>
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}

      {correcting && (
        <Modal title="Correct attendance" onClose={() => setCorrecting(null)}>
          <form onSubmit={submitCorrection} className="space-y-4">
            <p className="text-sm text-gray-600">
              <span className="font-medium">{correcting.full_name}</span> · {date}
            </p>
            <div>
              <label htmlFor="fix-status" className="mb-1 block text-sm font-medium text-gray-700">Status</label>
              <select id="fix-status" value={status} onChange={(e) => setStatus(e.target.value)} className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm">
                {STATUSES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
              </select>
            </div>
            <div>
              <label htmlFor="fix-reason" className="mb-1 block text-sm font-medium text-gray-700">Reason (kept in the audit log)</label>
              <textarea id="fix-reason" required minLength={3} maxLength={255} value={reason} onChange={(e) => setReason(e.target.value)} rows={3} className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm" />
            </div>
            {correctionError && <p role="alert" className="text-sm text-red-600">{correctionError}</p>}
            <div className="flex justify-end gap-2">
              <button type="button" onClick={() => setCorrecting(null)} className="rounded-md border px-4 py-2 text-sm">Cancel</button>
              <button type="submit" disabled={correct.isPending} className="rounded-md bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-700 disabled:opacity-50">
                {correct.isPending ? 'Saving…' : 'Save correction'}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
