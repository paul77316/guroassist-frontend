import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import ExamFormModal from '../../components/ui/ExamFormModal';
import CompetenciesModal from '../../components/ui/CompetenciesModal';
import { useClasses } from '../../hooks/useClasses';
import { useExams, useRestoreExam } from '../../hooks/useExams';
import { firstError } from '../../utils/errors';
import { prettyDate } from '../../utils/dates';

const selectCls = 'rounded-md border border-gray-300 px-3 py-2 text-sm';
const classText = (c) => {
  const name = c.label ?? [c.grade_level, c.section].filter(Boolean).join(' - ');
  return `${name}${c.subject ? ` (${c.subject})` : ''}`;
};
const plural = (n, one, many) => `${n} ${n === 1 ? one : many}`;

/** The teacher's exams. Rows carry counts only; the questions are on the exam page. */
export default function ExamsPage() {
  const navigate = useNavigate();
  const { data: classes = [] } = useClasses();

  const [classId, setClassId] = useState('');
  const [showDeleted, setShowDeleted] = useState(false);
  const [creating, setCreating] = useState(false);
  const [managing, setManaging] = useState(false);
  const [restoreError, setRestoreError] = useState('');

  const { data, isLoading, isError, error } = useExams(classId, showDeleted);
  const restore = useRestoreExam();
  const rows = data ?? [];

  const onRestore = (id) => {
    setRestoreError('');
    restore.mutate(id, { onError: (err) => setRestoreError(firstError(err, 'Could not restore this exam.')) });
  };

  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Exams</h2>
          <p className="mt-1 text-sm text-gray-500">
            Write multiple-choice exams for your classes, with one or more sets, and print the paper from the exam page. Scanning comes in a later step.
          </p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setManaging(true)} className="rounded-md border border-gray-300 px-3 py-1.5 text-sm hover:bg-gray-50">
            Competencies
          </button>
          {!showDeleted && (
            <button onClick={() => setCreating(true)} className="rounded-md bg-blue-600 px-3 py-1.5 text-sm text-white">
              New exam
            </button>
          )}
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-end gap-4">
        <div>
          <label className="mb-1 block text-xs font-medium text-gray-600">Class</label>
          <select value={classId} onChange={(e) => setClassId(e.target.value)} className={selectCls}>
            <option value="">All classes</option>
            {classes.map((c) => <option key={c.id} value={c.id}>{classText(c)}</option>)}
          </select>
        </div>
        <label className="flex items-center gap-2 pb-2 text-sm text-gray-600">
          <input type="checkbox" checked={showDeleted} onChange={(e) => setShowDeleted(e.target.checked)} />
          Show deleted
        </label>
      </div>

      {isLoading ? (
        <p className="py-6 text-center text-sm text-gray-500">Loading...</p>
      ) : isError ? (
        <p className="py-6 text-center text-sm text-red-600">{firstError(error, 'Could not load exams.')}</p>
      ) : !data ? (
        <p className="py-6 text-center text-sm text-gray-500">Loading...</p>
      ) : rows.length === 0 ? (
        <p className="mt-4 rounded-lg border border-dashed border-gray-300 p-8 text-center text-sm text-gray-500">
          {showDeleted
            ? 'No deleted exams.'
            : classId
              ? 'You have no exams for this class yet.'
              : 'You have not created any exams yet. Choose New exam to start.'}
        </p>
      ) : (
        <ul className="mt-4 space-y-2">
          {rows.map((r) => (
            <li key={r.id} className="rounded-lg border border-gray-200 bg-white p-4">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="min-w-0">
                  {showDeleted ? (
                    <p className="break-words text-sm font-medium text-gray-900">{r.title}</p>
                  ) : (
                    <Link to={`/exams/${r.id}`} className="break-words text-sm font-medium text-blue-700 hover:underline">
                      {r.title}
                    </Link>
                  )}
                  <p className="mt-0.5 text-xs text-gray-500">
                    {r.class ? classText(r.class) : 'Class'} - {prettyDate(r.exam_date)}
                  </p>
                  <p className="mt-0.5 text-xs text-gray-500">
                    {plural(r.set_count ?? 0, 'set', 'sets')} - {plural(r.question_count ?? 0, 'question', 'questions')} -{' '}
                    {r.choice_count} choices
                  </p>
                </div>

                {showDeleted ? (
                  <button
                    onClick={() => onRestore(r.id)}
                    disabled={restore.isPending}
                    className="rounded-md border border-gray-300 px-3 py-1.5 text-sm hover:bg-gray-50 disabled:opacity-50"
                  >
                    Restore
                  </button>
                ) : (
                  <button
                    onClick={() => navigate(`/exams/${r.id}`)}
                    className="rounded-md border border-gray-300 px-3 py-1.5 text-sm hover:bg-gray-50"
                  >
                    Open
                  </button>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}

      {restoreError && <p className="mt-2 text-sm text-red-600">{restoreError}</p>}

      <p className="mt-4 text-xs text-gray-500">
        Exams are private to the teacher who wrote them and to administrators. An exam holds questions only, never
        student information. Exams of an archived class are not shown.
      </p>

      {creating && (
        <ExamFormModal onClose={() => setCreating(false)} onSaved={(exam) => navigate(`/exams/${exam.id}`)} />
      )}
      {managing && <CompetenciesModal onClose={() => setManaging(false)} />}
    </div>
  );
}