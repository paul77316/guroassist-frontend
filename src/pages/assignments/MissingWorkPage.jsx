import { useState } from 'react';
import { Link } from 'react-router-dom';
import ClassSelect from '../../components/ui/ClassSelect';
import AssignmentTabs from '../../components/ui/AssignmentTabs';
import ReviewActions from '../../components/ui/ReviewActions';
import InterventionFormModal from '../../components/ui/InterventionFormModal';
import { useSelectedClass } from '../../hooks/useSelectedClass';
import { useMissingWork } from '../../hooks/useAssignments';
import { useActiveInterventions } from '../../hooks/useInterventions';
import { firstError } from '../../utils/errors';
import { prettyDate } from '../../utils/dates';

export default function MissingWorkPage() {
  const { classes, isLoading: classesLoading, classId, cls, setClassId } = useSelectedClass();
  const { data, isLoading, isError, error } = useMissingWork(classId);
  const { data: active = {} } = useActiveInterventions(); // student id -> open interventions
  const [onlyReview, setOnlyReview] = useState(false);
  const [starting, setStarting] = useState(null); // the student row an intervention is being started for

  const students = (data?.students ?? []).filter((s) => !onlyReview || s.needs_review);

  return (
    <div>
      <h2 className="text-lg font-semibold text-gray-900">Activities</h2>
      <p className="mt-1 text-sm text-gray-500">
        Overdue work with no submission recorded. These are prompts for you to look at, not conclusions about a student.
      </p>
      <AssignmentTabs classId={classId} />

      {classesLoading ? (
        <p className="mt-6 text-sm text-gray-500">Loading classes…</p>
      ) : classes.length === 0 ? (
        <p className="mt-6 rounded-lg border border-dashed border-gray-300 p-8 text-center text-sm text-gray-500">
          You don't have any classes yet. Add one on the Classes page first.
        </p>
      ) : (
        <>
          <div className="mt-6 flex flex-wrap items-end gap-4">
            <ClassSelect classes={classes} value={classId} onChange={setClassId} />
            <label className="flex items-center gap-2 pb-2 text-sm text-gray-700">
              <input type="checkbox" checked={onlyReview} onChange={(e) => setOnlyReview(e.target.checked)} />
              Only students to review
            </label>
          </div>

          {isLoading ? (
            <p className="mt-6 text-sm text-gray-500">Loading report…</p>
          ) : isError ? (
            <p className="mt-6 text-sm text-red-600">{firstError(error, 'Failed to load the report.')}</p>
          ) : !data ? (
            <p className="mt-6 text-sm text-gray-500">Loading report…</p>
          ) : (
            <div className="mt-6">
              <p className="mb-3 text-sm text-gray-600">
                {data.assignments_due} overdue {data.assignments_due === 1 ? 'activity' : 'activities'} ·{' '}
                {data.summary.needs_review_count} to review (at {data.threshold} or more missing)
              </p>

              {data.assignments_due === 0 ? (
                <p className="rounded-lg border border-dashed border-gray-300 p-8 text-center text-sm text-gray-500">
                  No activities are past their due date yet.
                </p>
              ) : students.length === 0 ? (
                <p className="rounded-lg border border-dashed border-gray-300 p-8 text-center text-sm text-gray-500">
                  {onlyReview ? 'No students need review right now.' : 'No active students are enrolled in this class.'}
                </p>
              ) : (
                <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white">
                  <table className="min-w-full text-left text-sm">
                    <thead className="bg-gray-50 text-xs uppercase text-gray-500">
                      <tr>
                        <th className="px-4 py-2">Student</th>
                        <th className="px-3 py-2 text-right">Missing</th>
                        <th className="px-3 py-2 text-right">Late</th>
                        <th className="px-4 py-2">Missing activities</th>
                        <th className="px-4 py-2">Review</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {students.map((s) => (
                        <tr key={s.student_id} className={s.needs_review ? 'bg-amber-50/50' : ''}>
                          <td className="whitespace-nowrap px-4 py-2 font-medium text-gray-900">{s.full_name}</td>
                          <td className="px-3 py-2 text-right text-gray-900">{s.missing_count}</td>
                          <td className="px-3 py-2 text-right text-gray-600">{s.late_count}</td>
                          <td className="px-4 py-2">
                            {s.missing.length === 0 ? (
                              <span className="text-gray-300">—</span>
                            ) : (
                              <ul className="space-y-0.5 text-xs">
                                {s.missing.map((m) => (
                                  <li key={m.id}>
                                    <Link to={`/assignments/${m.id}`} className="text-blue-700 hover:underline">
                                      {m.title}
                                    </Link>{' '}
                                    <span className="text-gray-400">due {prettyDate(m.due_date)}</span>
                                  </li>
                                ))}
                              </ul>
                            )}
                          </td>
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
              )}

              <p className="mt-2 text-xs text-gray-500">
                Only activities that are not deleted and are past their due date count. Work handed in late counts
                as handed in, excused work is not counted, and activities due before a student joined the class are
                not counted. Change the review threshold in{' '}
                <Link to="/settings" className="text-blue-600 hover:underline">Settings</Link>.
              </p>
            </div>
          )}
        </>
      )}

      {starting && cls && (
        <InterventionFormModal
          studentId={starting.student_id}
          classes={[{ id: cls.id, label: `${cls.grade_level} - ${cls.section}`, subject: cls.subject }]}
          initial={{
            class_assignment_id: cls.id,
            concern_type: 'missing_work',
            concern: starting.reasons.join(' '),
          }}
          onClose={() => setStarting(null)}
        />
      )}
    </div>
  );
}
