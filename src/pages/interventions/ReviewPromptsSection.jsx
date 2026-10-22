import { useState } from 'react';
import { useStudentsToReview } from '../../hooks/useInterventions';
import { firstError } from '../../utils/errors';
import { prettyDate } from '../../utils/dates';
import { classLabel } from '../../utils/classLabel';

const selectCls = 'rounded-md border border-gray-300 px-3 py-2 text-sm';

/**
 * Students who match a review prompt. A prompt is handled once the teacher completed an intervention for
 * that concern; handled prompts are hidden here unless "Show handled" is ticked. Nothing is stored for this:
 * the server works it out from the interventions every time.
 */
export default function ReviewPromptsSection({ onStart }) {
  const { data, isLoading, isError, error } = useStudentsToReview();
  const [type, setType] = useState('');
  const [classId, setClassId] = useState('');
  const [hideActive, setHideActive] = useState(false);
  const [showHandled, setShowHandled] = useState(false);

  const classes = data?.meta?.classes ?? [];
  const handledDays = data?.meta?.handled_days ?? 30;
  const all = data?.data ?? [];

  // Filters apply to the prompts shown; a student appears only if at least one prompt matches.
  const rows = all
    .map((s) => ({
      ...s,
      shown: s.flags.filter(
        (f) => (!type || f.type === type) && (!classId || String(f.class.id) === classId) && (showHandled || !f.handled)
      ),
    }))
    .filter((s) => s.shown.length > 0 && (!hideActive || s.intervention.active_count === 0));

  const start = (s) => {
    const flag = s.shown[0];
    onStart({
      studentId: s.student_id,
      classes: s.classes,
      initial: {
        class_assignment_id: flag.class.id,
        concern_type: flag.type,
        concern: flag.reasons.join(' '),
      },
    });
  };

  const emptyText = () => {
    if (all.length === 0) return 'No students match a review prompt right now.';
    if (!showHandled && all.every((s) => !s.needs_attention)) {
      return 'Nothing is left to review. Prompts you already followed up with a completed intervention are hidden.';
    }
    return 'No students match these filters.';
  };

  return (
    <section className="mt-6">
      <h3 className="text-sm font-semibold uppercase tracking-wide text-gray-500">Students to review</h3>

      {isLoading ? (
        <p className="mt-4 text-sm text-gray-500">Loading...</p>
      ) : isError ? (
        <p className="mt-4 text-sm text-red-600">{firstError(error, 'Could not load the review list.')}</p>
      ) : !data ? (
        <p className="mt-4 text-sm text-gray-500">Loading...</p>
      ) : classes.length === 0 ? (
        <p className="mt-4 rounded-lg border border-dashed border-gray-300 p-8 text-center text-sm text-gray-500">
          You don't have any classes yet. Add one on the Classes page first.
        </p>
      ) : (
        <>
          <div className="mt-3 flex flex-wrap items-end gap-4">
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-600">Prompt</label>
              <select value={type} onChange={(e) => setType(e.target.value)} className={selectCls}>
                <option value="">All prompts</option>
                <option value="attendance_concern">Attendance concern</option>
                <option value="missing_work">Missing work</option>
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-600">Class</label>
              <select value={classId} onChange={(e) => setClassId(e.target.value)} className={selectCls}>
                <option value="">All classes</option>
                {classes.map((c) => <option key={c.id} value={c.id}>{classLabel(c)}</option>)}
              </select>
            </div>
            <label className="flex items-center gap-2 pb-2 text-sm text-gray-700">
              <input type="checkbox" checked={hideActive} onChange={(e) => setHideActive(e.target.checked)} />
              Hide students with an active intervention
            </label>
            <label className="flex items-center gap-2 pb-2 text-sm text-gray-700">
              <input type="checkbox" checked={showHandled} onChange={(e) => setShowHandled(e.target.checked)} />
              Show handled prompts
            </label>
          </div>

          {rows.length === 0 ? (
            <p className="mt-4 rounded-lg border border-dashed border-gray-300 p-8 text-center text-sm text-gray-500">
              {emptyText()}
            </p>
          ) : (
            <div className="mt-4 overflow-x-auto rounded-lg border border-gray-200 bg-white">
              <table className="min-w-full text-left text-sm">
                <thead className="bg-gray-50 text-xs uppercase text-gray-500">
                  <tr>
                    <th className="px-4 py-2">Student</th>
                    <th className="px-4 py-2">Review prompts</th>
                    <th className="px-4 py-2">Intervention</th>
                    <th className="px-4 py-2" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {rows.map((s) => (
                    <tr key={s.student_id}>
                      <td className="whitespace-nowrap px-4 py-2 align-top">
                        <p className="font-medium text-gray-900">{s.full_name}</p>
                        <p className="text-xs text-gray-400">{s.student_number}</p>
                      </td>
                      <td className="px-4 py-2 align-top">
                        <ul className="space-y-2">
                          {s.shown.map((f, i) => (
                            <li key={`${f.type}-${f.class.id}-${i}`}>
                              <span
                                className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${
                                  f.handled ? 'bg-gray-100 text-gray-600' : 'bg-amber-100 text-amber-700'
                                }`}
                              >
                                {f.label}
                              </span>{' '}
                              <span className="text-xs text-gray-500">{classLabel(f.class)}</span>
                              {f.handled && (
                                <p className="mt-0.5 text-xs text-green-700">
                                  Handled: intervention completed {prettyDate(f.handled.completed_on)}
                                  {f.handled.outcome_label ? ` - ${f.handled.outcome_label}` : ''}
                                </p>
                              )}
                              <ul className="mt-0.5 space-y-0.5 text-xs text-gray-500">
                                {f.reasons.map((r) => <li key={r}>{r}</li>)}
                              </ul>
                            </li>
                          ))}
                        </ul>
                      </td>
                      <td className="px-4 py-2 align-top">
                        {s.intervention.active_count > 0 ? (
                          <div className="space-y-1">
                            <span className="inline-block rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-700">
                              Intervention active
                            </span>
                            {s.intervention.follow_up_due && (
                              <span className="block text-xs text-amber-700">Follow-up due</span>
                            )}
                          </div>
                        ) : (
                          <span className="text-gray-300">-</span>
                        )}
                      </td>
                      <td className="px-4 py-2 text-right align-top">
                        <button
                          onClick={() => start(s)}
                          className="whitespace-nowrap rounded-md border border-gray-300 px-3 py-1.5 text-sm hover:bg-gray-50"
                        >
                          Start intervention
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <p className="mt-2 text-xs text-gray-500">
            Attendance is looked at over the last 30 days. A prompt is hidden for {handledDays} days after you
            complete an intervention for that concern, and comes back if the data still triggers it. Tick
            Show handled prompts to see what was left out. Start intervention opens the form with the concern
            filled in; you can change it before saving.
          </p>
        </>
      )}
    </section>
  );
}
