import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import ExamFormModal from '../../components/ui/ExamFormModal';
import CompetenciesModal from '../../components/ui/CompetenciesModal';
import QuestionFormModal from '../../components/ui/QuestionFormModal';
import MathText from '../../components/ui/MathText';
import CompetencyCoverage from '../../components/ui/CompetencyCoverage';
import {
  useExam, useExamSet, useExamOptions, useDeleteExam, useAddSet, useDeleteSet,
  useDeleteQuestion, useReorderQuestions,
} from '../../hooks/useExams';
import { firstError } from '../../utils/errors';
import { prettyDate } from '../../utils/dates';

const classText = (c) => {
  const name = c.label ?? [c.grade_level, c.section].filter(Boolean).join(' - ');
  return `${name}${c.subject ? ` (${c.subject})` : ''}`;
};
const plural = (n, one, many) => `${n} ${n === 1 ? one : many}`;

/** One exam: its sets (A, B, ...) and the questions of the selected set. */
export default function ExamDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();

  const { data: exam, isLoading, isError, error } = useExam(id);
  const { data: options } = useExamOptions();
  const delExam = useDeleteExam();
  const addSet = useAddSet();
  const delSet = useDeleteSet();

  const [selectedSetId, setSelectedSetId] = useState(null);
  const [editing, setEditing] = useState(false);
  const [managing, setManaging] = useState(false);
  const [actionError, setActionError] = useState('');

  if (isLoading) return <p className="py-8 text-center text-sm text-gray-500">Loading...</p>;

  if (isError) {
    return (
      <div className="py-8 text-center">
        <p className="text-sm text-red-600">
          {error?.status === 403
            ? "You don't have access to this exam."
            : error?.status === 404
              ? 'This exam no longer exists.'
              : firstError(error, 'Could not load this exam.')}
        </p>
        <Link to="/exams" className="mt-3 inline-block text-sm text-blue-600 hover:underline">Back to exams</Link>
      </div>
    );
  }

  if (!exam) return <p className="py-8 text-center text-sm text-gray-500">Loading...</p>;

  const sets = exam.sets ?? [];
  const activeId = sets.some((s) => s.id === selectedSetId) ? selectedSetId : sets[0]?.id;
  const active = sets.find((s) => s.id === activeId);
  const maxSets = options?.max_sets ?? 10;
  const maxQuestions = options?.max_questions ?? 50;

  const onDeleteExam = () => {
    if (!window.confirm('Delete this exam? You can restore it later from the exams list.')) return;
    setActionError('');
    delExam.mutate(exam.id, {
      onSuccess: () => navigate('/exams'),
      onError: (err) => setActionError(firstError(err, 'Could not delete this exam.')),
    });
  };

  const onAddSet = () => {
    setActionError('');
    addSet.mutate(exam.id, {
      onSuccess: (set) => setSelectedSetId(set.id),
      onError: (err) => setActionError(firstError(err, 'Could not add a set.')),
    });
  };

  const onDeleteSet = () => {
    if (!active) return;
    const n = active.question_count ?? 0;
    if (!window.confirm(`Delete Set ${active.label}${n ? ` and its ${plural(n, 'question', 'questions')}` : ''}?`)) return;
    setActionError('');
    delSet.mutate(active.id, {
      onSuccess: () => setSelectedSetId(null),
      onError: (err) => setActionError(firstError(err, 'Could not delete this set.')),
    });
  };

  return (
    <div>
      <Link to="/exams" className="text-sm text-blue-600 hover:underline">Back to exams</Link>

      <div className="mt-2 flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="break-words text-lg font-semibold text-gray-900">{exam.title}</h2>
          <p className="mt-0.5 text-sm text-gray-500">
            {exam.class ? classText(exam.class) : 'Class'} - {prettyDate(exam.exam_date)} - {exam.choice_count} choices per question
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            to={`/exams/${exam.id}/print${active ? `?set=${active.id}` : ''}`}
            className="rounded-md border border-gray-300 px-3 py-1.5 text-sm hover:bg-gray-50"
          >
            Print
          </Link>
          <button onClick={() => setManaging(true)} className="rounded-md border border-gray-300 px-3 py-1.5 text-sm hover:bg-gray-50">
            Competencies
          </button>
          <button onClick={() => setEditing(true)} className="rounded-md border border-gray-300 px-3 py-1.5 text-sm hover:bg-gray-50">
            Edit
          </button>
          <button
            onClick={onDeleteExam}
            disabled={delExam.isPending}
            className="rounded-md border border-red-200 px-3 py-1.5 text-sm text-red-600 hover:bg-red-50 disabled:opacity-50"
          >
            {delExam.isPending ? 'Deleting...' : 'Delete'}
          </button>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2 border-b border-gray-200 pb-2" role="tablist">
        {sets.map((s) => (
          <button
            key={s.id}
            type="button"
            role="tab"
            aria-selected={s.id === activeId}
            onClick={() => setSelectedSetId(s.id)}
            className={`rounded-md px-3 py-1.5 text-sm font-medium ${
              s.id === activeId ? 'bg-blue-600 text-white' : 'border border-gray-300 text-gray-700 hover:bg-gray-50'
            }`}
          >
            Set {s.label}
            <span className={`ml-1.5 text-xs ${s.id === activeId ? 'text-blue-100' : 'text-gray-400'}`}>
              {s.question_count ?? 0}
            </span>
          </button>
        ))}
        <button
          type="button"
          onClick={onAddSet}
          disabled={addSet.isPending || sets.length >= maxSets}
          className="rounded-md border border-dashed border-gray-300 px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-50 disabled:opacity-50"
        >
          {addSet.isPending ? 'Adding...' : 'Add set'}
        </button>
        {sets.length > 1 && active && (
          <button
            type="button"
            onClick={onDeleteSet}
            disabled={delSet.isPending}
            className="ml-auto text-sm text-red-600 hover:underline disabled:opacity-50"
          >
            Delete Set {active.label}
          </button>
        )}
      </div>

      {actionError && <p className="mt-2 text-sm text-red-600">{actionError}</p>}

      {active ? (
        <SetPanel key={active.id} exam={exam} setId={active.id} label={active.label} maxQuestions={maxQuestions} />
      ) : (
        <p className="mt-6 text-center text-sm text-gray-500">This exam has no sets.</p>
      )}

      <CompetencyCoverage exam={exam} />

      <p className="mt-6 text-xs text-gray-500">
        Each set has its own questions and answer key. Results are grouped by competency across the sets of an exam.
        Exams are private to you and administrators.
      </p>

      {editing && <ExamFormModal exam={exam} onClose={() => setEditing(false)} />}
      {managing && <CompetenciesModal onClose={() => setManaging(false)} />}
    </div>
  );
}

/** The questions of one set, with add, edit, delete and move up or down. */
function SetPanel({ exam, setId, label, maxQuestions }) {
  const { data: set, isLoading, isError, error } = useExamSet(setId);
  const reorder = useReorderQuestions();
  const delQuestion = useDeleteQuestion();

  const [form, setForm] = useState(null); // 'new' or the question being edited
  const [panelError, setPanelError] = useState('');

  const questions = set?.questions ?? [];
  const full = questions.length >= maxQuestions;

  const move = (index, step) => {
    const ids = questions.map((q) => q.id);
    const other = index + step;
    [ids[index], ids[other]] = [ids[other], ids[index]];
    setPanelError('');
    reorder.mutate({ setId, ids }, { onError: (err) => setPanelError(firstError(err, 'Could not move the question.')) });
  };

  const onDelete = (q) => {
    if (!window.confirm(`Delete question ${q.position}?`)) return;
    setPanelError('');
    delQuestion.mutate(q.id, { onError: (err) => setPanelError(firstError(err, 'Could not delete the question.')) });
  };

  return (
    <section className="mt-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-gray-600">
          Set {label}: {questions.length} of {maxQuestions} questions
        </p>
        <button
          onClick={() => setForm('new')}
          disabled={full || isLoading || isError}
          className="rounded-md bg-blue-600 px-3 py-1.5 text-sm text-white disabled:opacity-50"
        >
          Add question
        </button>
      </div>

      {isLoading ? (
        <p className="py-6 text-center text-sm text-gray-500">Loading...</p>
      ) : isError ? (
        <p className="py-6 text-center text-sm text-red-600">{firstError(error, 'Could not load this set.')}</p>
      ) : !set ? (
        <p className="py-6 text-center text-sm text-gray-500">Loading...</p>
      ) : questions.length === 0 ? (
        <p className="mt-3 rounded-lg border border-dashed border-gray-300 p-8 text-center text-sm text-gray-500">
          No questions in Set {label} yet. Choose Add question to write the first one.
        </p>
      ) : (
        <ol className="mt-3 space-y-2">
          {questions.map((q, i) => (
            <li key={q.id} className="rounded-lg border border-gray-200 bg-white p-3">
              <div className="flex items-start gap-3">
                <span className="mt-0.5 w-7 shrink-0 text-sm font-semibold text-gray-500">{q.position}.</span>
                <div className="min-w-0 flex-1">
                  <div className="line-clamp-2 text-sm text-gray-900">
                    <MathText text={q.body} />
                  </div>
                  <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-gray-500">
                    <span>Answer {q.correct_choice}</span>
                    <span>{q.competency ? q.competency.name : 'No competency'}</span>
                    {q.has_image && <span>Has image</span>}
                  </div>
                </div>
                <div className="flex shrink-0 flex-wrap justify-end gap-1.5">
                  <button
                    onClick={() => move(i, -1)}
                    disabled={i === 0 || reorder.isPending}
                    aria-label={`Move question ${q.position} up`}
                    className="rounded-md border border-gray-300 px-2 py-1 text-sm hover:bg-gray-50 disabled:opacity-40"
                  >
                    Up
                  </button>
                  <button
                    onClick={() => move(i, 1)}
                    disabled={i === questions.length - 1 || reorder.isPending}
                    aria-label={`Move question ${q.position} down`}
                    className="rounded-md border border-gray-300 px-2 py-1 text-sm hover:bg-gray-50 disabled:opacity-40"
                  >
                    Down
                  </button>
                  <button onClick={() => setForm(q)} className="rounded-md border border-gray-300 px-2 py-1 text-sm hover:bg-gray-50">
                    Edit
                  </button>
                  <button
                    onClick={() => onDelete(q)}
                    disabled={delQuestion.isPending}
                    className="rounded-md border border-red-200 px-2 py-1 text-sm text-red-600 hover:bg-red-50 disabled:opacity-50"
                  >
                    Delete
                  </button>
                </div>
              </div>
            </li>
          ))}
        </ol>
      )}

      {panelError && <p className="mt-2 text-sm text-red-600">{panelError}</p>}

      {form && (
        <QuestionFormModal
          key={form === 'new' ? 'new' : form.id}
          setId={setId}
          choiceCount={exam.choice_count}
          question={form === 'new' ? null : form}
          onClose={() => setForm(null)}
        />
      )}
    </section>
  );
}