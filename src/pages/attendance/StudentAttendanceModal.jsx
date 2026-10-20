import { useMemo, useState } from 'react';
import Modal from '../../components/ui/Modal';
import { useStudentAttendance } from '../../hooks/useMonitoring';
import { saveBlob } from '../../utils/download';
import { toCsv } from '../../utils/csv';

const STATUS = {
  present: { label: 'Present', cls: 'bg-green-100 text-green-700' },
  absent: { label: 'Absent', cls: 'bg-red-100 text-red-700' },
  late: { label: 'Late', cls: 'bg-amber-100 text-amber-700' },
  excused: { label: 'Excused', cls: 'bg-blue-100 text-blue-700' },
};

const FILTERS = [
  ['issues', 'Absent, late & excused'],
  ['absent', 'Absent'],
  ['late', 'Late'],
  ['excused', 'Excused'],
  ['unmarked', 'Not recorded'],
  ['all', 'All days'],
];

// "2030-01-04" -> "Fri, Jan 4, 2030" (built from parts so the date never shifts with the timezone)
const pretty = (ymd) => {
  const [y, m, d] = ymd.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString('en-PH', {
    weekday: 'short', month: 'short', day: 'numeric', year: 'numeric',
  });
};

export default function StudentAttendanceModal({ cls, student, from, to, onClose }) {
  const [filter, setFilter] = useState('issues');
  const { data, isLoading, isError, error } = useStudentAttendance(cls.id, student.student_id, from, to);

  const rows = useMemo(() => {
    if (!data) return [];
    if (filter === 'unmarked') return data.unmarked_dates.map((date) => ({ date, status: null, remarks: null }));
    if (filter === 'all') return data.records;
    if (filter === 'issues') return data.records.filter((r) => r.status !== 'present');
    return data.records.filter((r) => r.status === filter);
  }, [data, filter]);

  const exportCsv = () => {
    const label = (r) => (r.status ? STATUS[r.status].label : 'Not recorded');
    const csv = toCsv([
      ['date', 'status', 'remarks'],
      ...rows.map((r) => [r.date, label(r), r.remarks ?? '']),
    ]);
    saveBlob(
      new Blob([csv], { type: 'text/csv;charset=utf-8' }),
      `attendance_${data.student.student_number}_${data.period.from}_${data.period.to}.csv`
    );
  };

  const st = data?.stats;
  const chip = (label, value) => (
    <div className="rounded-md border border-gray-200 px-3 py-2 text-center">
      <p className="text-lg font-semibold text-gray-900">{value}</p>
      <p className="text-xs text-gray-500">{label}</p>
    </div>
  );

  return (
    <Modal title={student.full_name} onClose={onClose} maxWidth="max-w-2xl">
      <p className="-mt-2 mb-3 text-sm text-gray-500">
        {cls.grade_level} - {cls.section} ({cls.subject}) · {from} to {to}
      </p>

      {isLoading ? (
        <p className="py-6 text-center text-sm text-gray-500">Loading…</p>
      ) : isError ? (
        <p className="py-6 text-center text-sm text-red-600">
          {Object.values(error?.errors ?? {}).flat()[0] ?? error?.message ?? 'Could not load this student.'}
        </p>
      ) : !data ? (
        <p className="py-6 text-center text-sm text-gray-500">Loading…</p>
      ) : (
        <>
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
            {chip('Present', st.present)}
            {chip('Late', st.late)}
            {chip('Absent', st.absent)}
            {chip('Excused', st.excused)}
            {chip('Rate', st.attendance_rate != null ? `${st.attendance_rate}%` : '—')}
            {chip('Absent in a row', st.consecutive_absences)}
          </div>

          {st.needs_review && (
            <div className="mt-3 rounded-md bg-amber-50 p-3 text-sm text-amber-800">
              <p className="font-medium">{st.label}</p>
              <ul className="mt-1 list-disc pl-5 text-xs">
                {st.reasons.map((r) => <li key={r}>{r}</li>)}
              </ul>
            </div>
          )}

          <div className="mt-4 flex flex-wrap gap-2">
            {FILTERS.map(([key, label]) => (
              <button
                key={key}
                onClick={() => setFilter(key)}
                className={`rounded-full border px-3 py-1 text-xs font-medium ${
                  filter === key ? 'border-blue-600 bg-blue-600 text-white' : 'border-gray-300 text-gray-600 hover:bg-gray-50'
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          <div className="mt-3 max-h-72 overflow-y-auto rounded-md border border-gray-200">
            {rows.length === 0 ? (
              <p className="p-6 text-center text-sm text-gray-500">
                {filter === 'issues'
                  ? 'No absences, lates, or excused days in this period.'
                  : 'Nothing to show for this filter.'}
              </p>
            ) : (
              <table className="w-full text-left text-sm">
                <thead className="sticky top-0 bg-gray-50 text-xs uppercase text-gray-500">
                  <tr>
                    <th className="px-4 py-2">Date</th>
                    <th className="px-4 py-2">Status</th>
                    <th className="px-4 py-2">Remarks</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {rows.map((r) => (
                    <tr key={r.date}>
                      <td className="whitespace-nowrap px-4 py-2 text-gray-900">{pretty(r.date)}</td>
                      <td className="px-4 py-2">
                        {r.status ? (
                          <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS[r.status].cls}`}>
                            {STATUS[r.status].label}
                          </span>
                        ) : (
                          <span className="text-xs text-gray-400">Not recorded</span>
                        )}
                      </td>
                      <td className="px-4 py-2 text-gray-600">{r.remarks || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          <div className="mt-4 flex items-center justify-between">
            <p className="text-xs text-gray-500">
              {data.unmarked_dates.length > 0 &&
                `${data.unmarked_dates.length} class ${data.unmarked_dates.length === 1 ? 'day has' : 'days have'} no mark for this student.`}
            </p>
            <div className="flex gap-2">
              <button
                onClick={exportCsv}
                disabled={rows.length === 0}
                className="rounded-md border border-gray-300 px-3 py-2 text-sm hover:bg-gray-50 disabled:opacity-50"
              >
                Export CSV
              </button>
              <button onClick={onClose} className="rounded-md border px-4 py-2 text-sm">Close</button>
            </div>
          </div>
        </>
      )}
    </Modal>
  );
}