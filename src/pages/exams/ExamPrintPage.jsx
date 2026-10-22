import { useCallback, useEffect, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import MathText from '../../components/ui/MathText';
import { useExam, useExamSet, useQuestionImage } from '../../hooks/useExams';
import { firstError } from '../../utils/errors';
import { prettyDate } from '../../utils/dates';

const LETTERS = ['A', 'B', 'C', 'D', 'E'];
const DEFAULT_INSTRUCTIONS = 'Read each question carefully. Choose the letter of the best answer.';

// The paper size is left to the printer dialog (A4 or short bond both work).
const PRINT_CSS = `
@page { size: auto; margin: 15mm; }
@media print { html, body { background: #fff !important; } .no-print { display: none !important; } }
`;

const classText = (c) => {
  const name = c.label ?? [c.grade_level, c.section].filter(Boolean).join(' - ');
  return `${name}${c.subject ? ` (${c.subject})` : ''}`;
};

/**
 * Print view of one set: the test paper, or the teacher's answer key.
 * It sits outside the dashboard layout, so nothing but the paper is printed.
 * The Print button waits until the images and the math fonts have loaded.
 */
export default function ExamPrintPage() {
  const { id } = useParams();
  const [params, setParams] = useSearchParams();

  const { data: exam, isLoading, isError, error } = useExam(id);

  const sets = exam?.sets ?? [];
  const wanted = Number(params.get('set'));
  const activeId = sets.some((s) => s.id === wanted) ? wanted : sets[0]?.id;
  const active = sets.find((s) => s.id === activeId);

  const { data: set, isLoading: setLoading, isError: setIsError, error: setError } = useExamSet(activeId);

  const [mode, setMode] = useState('paper'); // 'paper' or 'key'
  const [instructions, setInstructions] = useState(DEFAULT_INSTRUCTIONS);
  const [imagesDone, setImagesDone] = useState({ setId: null, ids: new Set() });
  const [fontsReady, setFontsReady] = useState(false);

  const questions = set?.questions ?? [];
  const imageCount = questions.filter((q) => q.has_image).length;
  const doneCount = imagesDone.setId === activeId ? imagesDone.ids.size : 0;
  const imagesReady = doneCount >= imageCount;

  const onImageDone = useCallback(
    (questionId) =>
      setImagesDone((prev) => {
        if (prev.setId !== activeId) return { setId: activeId, ids: new Set([questionId]) };
        if (prev.ids.has(questionId)) return prev;
        return { setId: activeId, ids: new Set(prev.ids).add(questionId) };
      }),
    [activeId]
  );

  // Wait for the math fonts: give the page two frames to ask for them, then wait until they have loaded.
  const hasQuestions = questions.length > 0;
  useEffect(() => {
    if (!hasQuestions) return undefined;
    let cancelled = false;
    setFontsReady(false);
    const raf = requestAnimationFrame(() =>
      requestAnimationFrame(() => {
        const ready = document.fonts?.ready ?? Promise.resolve();
        ready.then(() => {
          if (!cancelled) setFontsReady(true);
        });
      })
    );
    return () => {
      cancelled = true;
      cancelAnimationFrame(raf);
    };
  }, [hasQuestions, activeId]);

  // The page title becomes the default file name when the teacher saves as PDF.
  useEffect(() => {
    if (!exam) return undefined;
    const old = document.title;
    document.title = `${exam.title}${active ? ` - Set ${active.label}` : ''}`;
    return () => {
      document.title = old;
    };
  }, [exam, active]);

  if (isLoading) return <p className="py-10 text-center text-sm text-gray-500">Loading...</p>;

  if (isError) {
    return (
      <div className="py-10 text-center">
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

  if (!exam) return <p className="py-10 text-center text-sm text-gray-500">Loading...</p>;

  const ready = !!set && hasQuestions && imagesReady && fontsReady;

  return (
    <div className="min-h-screen bg-gray-100 print:bg-white">
      <style>{PRINT_CSS}</style>

      {/* Screen only: choose what to print */}
      <div className="no-print border-b border-gray-200 bg-white px-4 py-3 print:hidden">
        <div className="mx-auto flex max-w-[190mm] flex-wrap items-end justify-between gap-3">
          <div className="flex flex-wrap items-end gap-4">
            <Link to={`/exams/${exam.id}`} className="pb-2 text-sm text-blue-600 hover:underline">Back to exam</Link>

            {sets.length > 1 && (
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-600">Set</label>
                <select
                  value={activeId ?? ''}
                  onChange={(e) => setParams({ set: e.target.value })}
                  className="rounded-md border border-gray-300 px-3 py-2 text-sm"
                >
                  {sets.map((s) => <option key={s.id} value={s.id}>Set {s.label}</option>)}
                </select>
              </div>
            )}

            <fieldset>
              <legend className="mb-1 text-xs font-medium text-gray-600">Print</legend>
              <div className="flex gap-3 pb-2 text-sm text-gray-700">
                <label className="flex items-center gap-1.5">
                  <input type="radio" name="mode" checked={mode === 'paper'} onChange={() => setMode('paper')} />
                  Test paper
                </label>
                <label className="flex items-center gap-1.5">
                  <input type="radio" name="mode" checked={mode === 'key'} onChange={() => setMode('key')} />
                  Answer key (teacher copy)
                </label>
              </div>
            </fieldset>
          </div>

          <button
            onClick={() => window.print()}
            disabled={!ready}
            className="rounded-md bg-blue-600 px-4 py-2 text-sm text-white disabled:opacity-50"
          >
            {ready ? 'Print' : hasQuestions ? 'Preparing...' : 'Print'}
          </button>
        </div>

        {mode === 'paper' && (
          <div className="mx-auto mt-3 max-w-[190mm]">
            <label className="mb-1 block text-xs font-medium text-gray-600">Instructions on the paper</label>
            <input
              type="text"
              value={instructions}
              maxLength={200}
              onChange={(e) => setInstructions(e.target.value)}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
            />
          </div>
        )}

        <p className="mx-auto mt-3 max-w-[190mm] text-xs text-gray-500">
          In the print window, choose the paper size you use (A4 or short bond) and print at 100 percent scale. The
          answer key shows the correct answers, so keep it away from students.
        </p>
      </div>

      {/* The page itself */}
      <div className="mx-auto my-4 max-w-[190mm] bg-white p-6 shadow print:my-0 print:max-w-none print:p-0 print:shadow-none">
        {setLoading ? (
          <p className="py-10 text-center text-sm text-gray-500">Loading...</p>
        ) : setIsError ? (
          <p className="py-10 text-center text-sm text-red-600">{firstError(setError, 'Could not load this set.')}</p>
        ) : !set ? (
          <p className="py-10 text-center text-sm text-gray-500">Loading...</p>
        ) : questions.length === 0 ? (
          <p className="py-10 text-center text-sm text-gray-500">
            Set {active?.label} has no questions yet. Add some on the exam page, then come back to print.
          </p>
        ) : mode === 'paper' ? (
          <PaperBody exam={exam} label={active.label} questions={questions} instructions={instructions} onImageDone={onImageDone} />
        ) : (
          <KeyBody exam={exam} label={active.label} questions={questions} />
        )}
      </div>
    </div>
  );
}

function Header({ exam, label, subtitle }) {
  return (
    <header className="border-b-2 border-gray-900 pb-3">
      <h1 className="break-words text-xl font-bold text-gray-900">{exam.title}</h1>
      <p className="mt-0.5 text-sm text-gray-700">
        {exam.class ? `${classText(exam.class)} - ` : ''}{prettyDate(exam.exam_date)} - Set {label}
      </p>
      {subtitle}
    </header>
  );
}

function PaperBody({ exam, label, questions, instructions, onImageDone }) {
  return (
    <div>
      <Header
        exam={exam}
        label={label}
        subtitle={
          <div className="mt-4 flex items-end gap-6 text-sm text-gray-900">
            <div className="flex flex-1 items-end gap-2">
              <span>Name:</span>
              <span className="h-5 flex-1 border-b border-gray-700" />
            </div>
            <div className="flex w-44 items-end gap-2">
              <span>Date:</span>
              <span className="h-5 flex-1 border-b border-gray-700" />
            </div>
          </div>
        }
      />

      {instructions.trim() && <p className="mt-3 text-sm italic text-gray-700">{instructions.trim()}</p>}

      <ol className="mt-4 space-y-5">
        {questions.map((q) => (
          <li key={q.id} className="break-inside-avoid">
            <div className="flex gap-2">
              <span className="w-7 shrink-0 text-sm font-semibold text-gray-900">{q.position}.</span>
              <div className="min-w-0 flex-1 text-sm text-gray-900">
                <MathText text={q.body} />
                {q.has_image && (
                  <div className="mt-2">
                    <PaperImage question={q} onDone={onImageDone} />
                  </div>
                )}
                <ul className="mt-2 space-y-1">
                  {q.choices.map((c, i) => (
                    <li key={i} className="flex gap-2">
                      <span className="w-5 shrink-0 font-semibold">{LETTERS[i]}.</span>
                      <MathText text={c} />
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </li>
        ))}
      </ol>
    </div>
  );
}

function KeyBody({ exam, label, questions }) {
  return (
    <div>
      <Header
        exam={exam}
        label={label}
        subtitle={<p className="mt-2 text-sm font-semibold text-gray-900">Answer key - teacher copy. Do not hand out.</p>}
      />
      <ol className="mt-4 columns-2 gap-8">
        {questions.map((q) => (
          <li key={q.id} className="mb-1.5 break-inside-avoid text-sm text-gray-900">
            <span className="inline-block w-8 font-semibold">{q.position}.</span>
            <span className="inline-block w-6 font-bold">{q.correct_choice}</span>
            <span className="text-xs text-gray-500">{q.competency ? q.competency.name : ''}</span>
          </li>
        ))}
      </ol>
    </div>
  );
}

/** A question image. It tells the page when it has loaded (or failed), so Print waits for it. */
function PaperImage({ question, onDone }) {
  const { data: blob, isError } = useQuestionImage(question);
  const [url, setUrl] = useState(null);

  useEffect(() => {
    if (!blob) {
      setUrl(null);
      return undefined;
    }
    const u = URL.createObjectURL(blob);
    setUrl(u);
    return () => URL.revokeObjectURL(u);
  }, [blob]);

  useEffect(() => {
    if (isError) onDone(question.id);
  }, [isError, onDone, question.id]);

  if (isError) return <p className="text-xs text-red-600">The image could not be loaded.</p>;
  if (!url) return <div className="h-24" />;

  return (
    <img
      src={url}
      alt={question.image_alt ?? ''}
      onLoad={() => onDone(question.id)}
      onError={() => onDone(question.id)}
      className="max-h-72 max-w-full object-contain"
    />
  );
}