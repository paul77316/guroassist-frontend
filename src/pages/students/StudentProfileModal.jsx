import { useState } from 'react';
import Modal from '../../components/ui/Modal';
import StudentInterventionsTab from '../../components/ui/StudentInterventionsTab';
import StudentNotesTab from '../../components/ui/StudentNotesTab';
import StudentCommunicationsTab from '../../components/ui/StudentCommunicationsTab';
import { useStudentProfile } from '../../hooks/useStudentProfile';

// "2013-03-15" -> "Mar 15, 2013" (built from parts so the date never shifts with the timezone)
const pretty = (ymd) => {
  if (!ymd) return null;
  const [y, m, d] = ymd.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' });
};

const Row = ({ label, children }) => (
  <div className="flex gap-3 py-1.5 text-sm">
    <dt className="w-36 shrink-0 text-gray-500">{label}</dt>
    <dd className="min-w-0 break-words text-gray-900">
      {children || <span className="text-gray-400">Not provided</span>}
    </dd>
  </div>
);

const Section = ({ title, children }) => (
  <section className="mt-5">
    <h4 className="border-b border-gray-200 pb-1 text-xs font-semibold uppercase tracking-wide text-gray-500">
      {title}
    </h4>
    {children}
  </section>
);

const Stat = ({ label, value }) => (
  <div className="rounded-md border border-gray-200 px-2 py-1.5 text-center">
    <p className="text-base font-semibold text-gray-900">{value}</p>
    <p className="text-xs text-gray-500">{label}</p>
  </div>
);

// Notes and Communication tabs are added in the next piece.
const TABS = [
  { key: 'details', label: 'Details' },
  { key: 'interventions', label: 'Interventions' },
  { key: 'notes', label: 'Notes' },
  { key: 'communication', label: 'Communication' },
];

export default function StudentProfileModal({ student, onClose, onEdit }) {
  const { data: p, isLoading, isError, error } = useStudentProfile(student.id);
  const [tab, setTab] = useState('details');

  return (
    <Modal title={student.full_name} onClose={onClose} maxWidth="max-w-2xl">
      {isLoading ? (
        <p className="py-8 text-center text-sm text-gray-500">Loading…</p>
      ) : isError ? (
        <p className="py-8 text-center text-sm text-red-600">
          {error?.status === 403
            ? "You don't have access to this student."
            : error?.message ?? 'Could not load this student.'}
        </p>
      ) : !p ? (
        <p className="py-8 text-center text-sm text-gray-500">Loading…</p>
      ) : (
        <>
          <div className="-mt-2 flex flex-wrap items-center gap-2 text-sm">
            <span className="text-gray-500">ID {p.student_id}</span>
            <span
              className={`rounded-full px-2 py-0.5 text-xs ${
                p.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'
              }`}
            >
              {p.status}
            </span>
            {p.grade_level && (
              <span className="rounded-full bg-blue-50 px-2 py-0.5 text-xs text-blue-700">{p.grade_level}</span>
            )}
          </div>

          <div className="mt-3 flex gap-1 border-b border-gray-200" role="tablist">
            {TABS.map((t) => (
              <button
                key={t.key}
                type="button"
                role="tab"
                aria-selected={tab === t.key}
                onClick={() => setTab(t.key)}
                className={`-mb-px border-b-2 px-3 py-2 text-sm font-medium ${
                  tab === t.key
                    ? 'border-blue-600 text-blue-700'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>

          {tab === 'details' && (
            <>
              <Section title="Personal">
                <dl>
                  <Row label="Full name">{p.full_name}</Row>
                  <Row label="Sex"><span className="capitalize">{p.sex}</span></Row>
                  <Row label="Date of birth">
                    {pretty(p.date_of_birth) && `${pretty(p.date_of_birth)}${p.age != null ? ` (${p.age} years old)` : ''}`}
                  </Row>
                  <Row label="Contact number">{p.contact_number}</Row>
                </dl>
              </Section>

              <Section title="Parent / guardian">
                <dl>
                  <Row label="Name">{p.guardian_name}</Row>
                  <Row label="Contact number">{p.guardian_contact}</Row>
                  <Row label="Email">
                    {p.guardian_email && (
                      <a href={`mailto:${p.guardian_email}`} className="text-blue-600 hover:underline">
                        {p.guardian_email}
                      </a>
                    )}
                  </Row>
                </dl>
              </Section>

              <Section title="Classes and attendance">
                {p.classes.length === 0 ? (
                  <p className="py-3 text-sm text-gray-500">Not enrolled in any of your classes.</p>
                ) : (
                  <div className="mt-2 space-y-3">
                    {p.classes.map((c) => {
                      const a = c.attendance;
                      return (
                        <div key={c.id} className="rounded-lg border border-gray-200 p-3">
                          <p className="text-sm font-medium text-gray-900">
                            {c.label} · {c.subject}
                          </p>
                          <p className="text-xs text-gray-500">
                            {c.academic_year}
                            {c.teacher ? ` · Teacher: ${c.teacher}` : ''}
                          </p>

                          <div className="mt-2 grid grid-cols-3 gap-2 sm:grid-cols-6">
                            <Stat label="Present" value={a.present} />
                            <Stat label="Late" value={a.late} />
                            <Stat label="Absent" value={a.absent} />
                            <Stat label="Excused" value={a.excused} />
                            <Stat label="Rate" value={a.attendance_rate != null ? `${a.attendance_rate}%` : '—'} />
                            <Stat label="Absent in a row" value={a.consecutive_absences} />
                          </div>

                          <p className="mt-2 text-xs text-gray-500">
                            Based on {a.days_counted} recorded {a.days_counted === 1 ? 'day' : 'days'} since{' '}
                            {pretty(a.period.from)}.
                          </p>

                          {a.needs_review && (
                            <div className="mt-2 rounded-md bg-amber-50 p-2 text-xs text-amber-800">
                              <p className="font-medium">{a.label}</p>
                              <ul className="mt-0.5 list-disc pl-4">
                                {a.reasons.map((r) => <li key={r}>{r}</li>)}
                              </ul>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </Section>
            </>
          )}

          {tab === 'interventions' && <StudentInterventionsTab studentId={student.id} classes={p.classes} />}
          {tab === 'notes' && <StudentNotesTab studentId={student.id} classes={p.classes} />}
          {tab === 'communication' && <StudentCommunicationsTab studentId={student.id} classes={p.classes} />}

          <div className="mt-6 flex justify-end gap-2">
            <button onClick={onEdit} className="rounded-md border border-gray-300 px-4 py-2 text-sm hover:bg-gray-50">
              Edit
            </button>
            <button onClick={onClose} className="rounded-md border px-4 py-2 text-sm">Close</button>
          </div>
        </>
      )}
    </Modal>
  );
}
