import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useClasses } from '../../hooks/useClasses';
import { useAttendanceSummary } from '../../hooks/useMonitoring';
import { useActiveInterventions } from '../../hooks/useInterventions';
import AttendanceTabs from '../../components/ui/AttendanceTabs';
import ReviewActions from '../../components/ui/ReviewActions';
import InterventionFormModal from '../../components/ui/InterventionFormModal';
import { saveBlob } from '../../utils/download';
import StudentAttendanceModal from './StudentAttendanceModal';

// Local dates: toISOString() is UTC and can return yesterday in PH time
const pad = (n) => String(n).padStart(2, '0');
const fmt = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const daysAgo = (n) => { const d = new Date(); d.setDate(d.getDate() - n); return fmt(d); };

// Stops spreadsheets from running a cell that starts with = + - @ as a formula
const safe = (v) => {
  const s = v == null ? '' : String(v);
  return /^[=+\-@\t\r]/.test(s) ? `'${s}` : s;
};
const cell = (v) => `"${safe(v).replace(/"/g, '""')}"`;

function exportCsv(data, cls) {
  const head = ['student_id', 'name', 'present', 'late', 'absent', 'excused', 'recorded_days',
    'attendance_rate', 'consecutive_absences', 'status', 'reasons'];
  const rows = data.students.map((s) => [
    s.student_number, s.full_name, s.present, s.late, s.absent, s.excused, s.days_counted,
    s.attendance_rate ?? '', s.consecutive_absences, s.label ?? '', s.reasons.join('; '),
  ]);
  const csv = '\uFEFF' + [head, ...rows].map((r) => r.map(cell).join(',')).join('\r\n');
  const name = `${cls.grade_level}-${cls.section}-${cls.subject}`.replace(/[^a-z0-9]+/gi, '_');
  saveBlob(new Blob([csv], { type: 'text/csv;charset=utf-8' }),
    `attendance_${name}_${data.period.from}_${data.period.to}.csv`);
}

export default function AttendanceReportPage() {
  const { data: classes = [], isLoading: classesLoading } = useClasses();
  const [classId, setClassId] = useState('');
  const [selected, setSelected] = useState(null);
  const [starting, setStarting] = useState(null); // the student row an intervention is being started for
  const [from, setFrom] = useState(daysAgo(29));
  const [to, setTo] = useState(daysAgo(0));

  useEffect(() => {
    if (!classId && classes.length > 0) setClassId(String(classes[0].id));
  }, [classes, classId]);

  const cls = classes.find((c) => String(c.id) === classId);
  const rangeOk = from && to && from <= to;
  const { data, isLoading, isError, error } = useAttendanceSummary(classId, from, to);
  const { data: active = {} } = useActiveInterventions(); // student id -> open interventions

  const inputCls = 'rounded-md border border-gray-300 px-3 py-2 text-sm';

  return (
    <div>
      <h2 className="text-lg font-semibold text-gray-900">Attendance</h2>
      <p className="mt-1 text-sm text-gray-500">Attendance patterns for a class. These are prompts for review, not conclusions.</p>
      <AttendanceTabs />

      {classesLoading ? (
        <p className="mt-6 text-sm text-gray-500">Loading classes…</p>
      ) : classes.length === 0 ? (
        <p className="mt-6 rounded-lg border border-dashed border-gray-300 p-8 text-center text-sm text-gray-500">
          You don't have any classes yet. Add one on the Classes page first.
        </p>
      ) : (
        <>
          <div className="mt-6 flex flex-wrap items-end gap-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Class</label>
              <select value={classId} onChange={(e) => setClassId(e.target.value)} className={inputCls}>
                {classes.map((c) => (
                  <option key={c.id} value={c.id}>{c.grade_level} - {c.section} ({c.subject})</option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">From</label>
              <input type="date" value={from} max={to || undefined} onChange={(e) => setFrom(e.target.value)} className={inputCls} />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">To</label>
              <input type="date" value={to} min={from || undefined} onChange={(e) => setTo(e.target.value)} className={inputCls} />
            </div>
            <button
              onClick={() => exportCsv(data, cls)}
              disabled={!data || data.students.length === 0}
              className="rounded-md border border-gray-300 px-3 py-2 text-sm hover:bg-gray-50 disabled:opacity-50"
            >
              Export CSV
            </button>
          </div>

          {!rangeOk ? (
            <p className="mt-6 text-sm text-amber-600">Choose a start date that is on or before the end date.</p>
          ) : isLoading ? (
            <p className="mt-6 text-sm text-gray-500">Loading report…</p>
         ) : isError ? (
            <p className="mt-6 text-sm text-red-600">
              {Object.values(error?.errors ?? {}).flat()[0] ?? error?.message ?? 'Failed to load the report.'}
            </p>
          ) : !data ? (
            <p className="mt-6 text-sm text-gray-500">Loading report…</p>
          ) : data.students.length === 0 ? (
            <p className="mt-6 rounded-lg border border-dashed border-gray-300 p-8 text-center text-sm text-gray-500">
              No active students are enrolled in this class.
            </p>
          ) : (
            <div className="mt-6">
              <p className="mb-3 text-sm text-gray-600">
                {data.class_days} class {data.class_days === 1 ? 'day' : 'days'} recorded ·{' '}
                class attendance {data.summary.class_rate != null ? `${data.summary.class_rate}%` : '—'} ·{' '}
                {data.summary.needs_review_count} to review
              </p>

              {data.class_days === 0 && (
                <p className="mb-3 rounded-md bg-gray-50 p-3 text-sm text-gray-600">
                  No attendance was recorded for this class in this period. Choose a wider range, or{' '}
                  <Link to="/attendance" className="text-blue-600 hover:underline">take attendance</Link>.
                </p>
              )}

              <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white">
                <table className="min-w-full text-left text-sm">
                  <thead className="bg-gray-50 text-xs uppercase text-gray-500">
                    <tr>
                      <th className="px-4 py-2">Student</th>
                      <th className="px-3 py-2 text-right">Present</th>
                      <th className="px-3 py-2 text-right">Late</th>
                      <th className="px-3 py-2 text-right">Absent</th>
                      <th className="px-3 py-2 text-right">Excused</th>
                      <th className="px-3 py-2 text-right">Rate</th>
                      <th className="px-3 py-2 text-right">Absent in a row</th>
                      <th className="px-4 py-2">Review</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {data.students.map((s) => (
                      <tr key={s.student_id} className={s.needs_review ? 'bg-amber-50/50' : ''}>
                       <td className="whitespace-nowrap px-4 py-2">
                            <button type="button" onClick={() => setSelected(s)} className="font-medium text-blue-700 hover:underline">
                                {s.full_name}
                            </button>
                        </td>
                        <td className="px-3 py-2 text-right text-gray-600">{s.present}</td>
                        <td className="px-3 py-2 text-right text-gray-600">{s.late}</td>
                        <td className="px-3 py-2 text-right text-gray-600">{s.absent}</td>
                        <td className="px-3 py-2 text-right text-gray-600">{s.excused}</td>
                        <td className="px-3 py-2 text-right text-gray-900">
                          {s.attendance_rate != null ? `${s.attendance_rate}%` : '—'}
                          <span className="block text-xs text-gray-400">{s.days_counted} days</span>
                        </td>
                        <td className="px-3 py-2 text-right text-gray-600">{s.consecutive_absences}</td>
                        <td className="px-4 py-2">
                          {s.needs_review ? (
                            <div>
                              <span className="inline-block rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700">
                                {s.label}
                              </span>
                              <ul className="mt-1 space-y-0.5 text-xs text-gray-500">
                                {s.reasons.map((r) => <li key={r}>{r}</li>)}
                              </ul>
                              <ReviewActions active={active[s.student_id]} onStart={() => setStarting(s)} />
                            </div>
                          ) : (
                            <span className="text-gray-300">—</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <p className="mt-2 text-xs text-gray-500">
                The rate counts only days attendance was recorded: (present + late) ÷ (present + late + absent).
                Excused days and days with no mark are left out. A rate is only judged after{' '}
                {data.settings.min_days_for_rate} recorded days. You can change these thresholds in{' '}
                <Link to="/settings" className="text-blue-600 hover:underline">Settings</Link>.
              </p>
            </div>
          )}
        </>
      )}
      {selected && cls && (
        <StudentAttendanceModal cls={cls} student={selected} from={from} to={to} onClose={() => setSelected(null)} />
      )}
      {starting && cls && (
        <InterventionFormModal
          studentId={starting.student_id}
          classes={[{ id: cls.id, label: `${cls.grade_level} - ${cls.section}`, subject: cls.subject }]}
          initial={{
            class_assignment_id: cls.id,
            concern_type: 'attendance_concern',
            concern: starting.reasons.join(' '),
          }}
          onClose={() => setStarting(null)}
        />
      )}
    </div>
  );
}
