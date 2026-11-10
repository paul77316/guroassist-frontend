import { useCallback, useMemo, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { useExam, useExamSet } from '../../hooks/useExams';
import { firstError } from '../../utils/errors';
import { prettyDate } from '../../utils/dates';
import { layoutFor, QR_BOX } from './print/sheetLayout';
import { qrPath } from './print/qrShapes';
import { classText, hasEmptyChoice } from './print/printHelpers';
import AnswerSheetSvg from './print/AnswerSheetSvg';
import TestPaperView from './print/TestPaperView';
import AnswerKeyView from './print/AnswerKeyView';

const MODES = [
  { id: 'paper', label: 'Test paper' },
  { id: 'sheet', label: 'Answer sheet' },
  { id: 'key', label: 'Answer key' },
];

/** Print page for one set. It sits outside the dashboard layout so only the paper is printed. */
export default function ExamPrintPage() {
  const { id } = useParams();
  const [params, setParams] = useSearchParams();
  const { data: exam, isLoading, isError, error } = useExam(id);

  if (isLoading || (!exam && !isError)) return <p className="py-8 text-center text-sm text-gray-500">Loading...</p>;

  if (isError) {
    return (
      <div className="py-8 text-center">
        <p className="text-sm text-red-600">
          {error?.status === 403 ? "You don't have access to this exam." : firstError(error, 'Could not load this exam.')}
        </p>
        <Link to="/exams" className="mt-3 inline-block text-sm text-blue-600 hover:underline">Back to exams</Link>
      </div>
    );
  }

  const sets = exam.sets ?? [];
  const wanted = Number(params.get('set'));
  const set = sets.find((s) => s.id === wanted) ?? sets[0];

  if (!set) {
    return (
      <div className="py-8 text-center">
        <p className="text-sm text-gray-500">This exam has no sets.</p>
        <Link to={`/exams/${exam.id}`} className="mt-3 inline-block text-sm text-blue-600 hover:underline">Back to the exam</Link>
      </div>
    );
  }

  return (
    <PrintBody
      key={set.id}
      exam={exam}
      set={set}
      sets={sets}
      onPickSet={(sid) => setParams({ set: String(sid) }, { replace: true })}
    />
  );
}

function PrintBody({ exam, set, sets, onPickSet }) {
  const { data: setData, isLoading, isError, error } = useExamSet(set.id);
  const [mode, setMode] = useState('paper');
  const [paperReady, setPaperReady] = useState(false);
  const onPaperReady = useCallback((v) => setPaperReady(v), []);

  const questions = setData?.questions ?? [];
  const token = setData?.qr_token ?? set.qr_token ?? null;
  const choiceCount = exam.choice_count;

  // Layout and QR for the answer sheet. Any failure is shown as a message, never a blank page.
  const sheet = useMemo(() => {
    if (mode !== 'sheet' || !setData) return null;
    if (!token) return { problem: 'This set has no QR token, so an answer sheet cannot be made.' };
    if (questions.length === 0) return { problem: 'Add questions to this set first.' };
    try {
      const layout = layoutFor(questions.length, choiceCount);
      const qr = qrPath(token, QR_BOX);
      return { layout, qr };
    } catch (e) {
      return { problem: 'The answer sheet could not be built. Check the number of questions and choices.' };
    }
  }, [mode, setData, token, questions.length, choiceCount]);

  const emptyChoice = !!setData && hasEmptyChoice(questions, choiceCount);
  const noQuestions = !!setData && questions.length === 0;
  const ready = !!setData && !noQuestions && (mode === 'paper' ? paperReady : mode === 'sheet' ? !!sheet?.layout : true);

  return (
    <div className="min-h-screen bg-gray-100 p-4 print:min-h-0 print:bg-white print:p-0">
      <style>{`@page { margin: ${mode === 'sheet' ? '0' : '15mm'}; }`}</style>

      <div className="mx-auto mb-4 max-w-3xl space-y-3 print:hidden">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <Link to={`/exams/${exam.id}`} className="text-sm text-blue-600 hover:underline">Back to the exam</Link>
          <button
            type="button"
            onClick={() => window.print()}
            disabled={!ready}
            className="rounded-md bg-blue-600 px-4 py-1.5 text-sm text-white disabled:opacity-50"
          >
            Print
          </button>
        </div>

        <p className="text-sm text-gray-700">
          {exam.title} - {classText(exam.class)} - {prettyDate(exam.exam_date)}
        </p>

        {sets.length > 1 && (
          <div className="flex flex-wrap gap-2" role="tablist" aria-label="Set">
            {sets.map((s) => (
              <button
                key={s.id}
                type="button"
                role="tab"
                aria-selected={s.id === set.id}
                onClick={() => onPickSet(s.id)}
                className={`rounded-md px-3 py-1 text-sm ${s.id === set.id ? 'bg-gray-800 text-white' : 'border border-gray-300 bg-white text-gray-700'}`}
              >
                Set {s.label}
              </button>
            ))}
          </div>
        )}

        <div className="flex flex-wrap gap-2" role="tablist" aria-label="What to print">
          {MODES.map((m) => (
            <button
              key={m.id}
              type="button"
              role="tab"
              aria-selected={mode === m.id}
              onClick={() => setMode(m.id)}
              className={`rounded-md px-3 py-1.5 text-sm font-medium ${mode === m.id ? 'bg-blue-600 text-white' : 'border border-gray-300 bg-white text-gray-700'}`}
            >
              {m.label}
            </button>
          ))}
        </div>

        {mode === 'paper' && (
          <p className="text-xs text-gray-600">In the print window, set Scale to 100% and turn off Headers and footers.</p>
        )}
        {mode === 'sheet' && (
          <p className="text-xs text-gray-600">
            In the print window, set Scale to 100%, Margins to None, and turn on Background graphics. Do not use
            Fit to page. Print the sheet on plain white paper. Students use a copy of this exact sheet, never a photocopy of a photocopy.
          </p>
        )}
        {mode === 'key' && <p className="text-xs text-gray-600">Teacher copy. Do not hand this page to students.</p>}

        {!setData && !isError && <p className="text-xs text-gray-500">Loading the set...</p>}
        {setData && !ready && !noQuestions && mode === 'paper' && (
          <p className="text-xs text-gray-500">Waiting for images and math fonts to load. Print turns on when they are ready.</p>
        )}
        {emptyChoice && (
          <p className="text-xs text-amber-700">
            At least one choice is empty on the test paper. Check the questions before printing.
          </p>
        )}
        {noQuestions && <p className="text-xs text-amber-700">Set {set.label} has no questions yet.</p>}
      </div>

      {isLoading ? (
        <p className="py-8 text-center text-sm text-gray-500 print:hidden">Loading...</p>
      ) : isError ? (
        <p className="py-8 text-center text-sm text-red-600 print:hidden">{firstError(error, 'Could not load this set.')}</p>
      ) : !setData || noQuestions ? null : mode === 'paper' ? (
        <TestPaperView exam={exam} set={set} questions={questions} onReadyChange={onPaperReady} />
      ) : mode === 'key' ? (
        <AnswerKeyView exam={exam} set={set} questions={questions} />
      ) : sheet?.problem ? (
        <p className="py-8 text-center text-sm text-red-600 print:hidden">{sheet.problem}</p>
      ) : sheet ? (
        <div className="overflow-x-auto print:overflow-visible">
          <div
            className="bg-white shadow print:shadow-none"
            style={{ width: '190mm', height: '260mm', margin: '8mm auto 0' }}
          >
            <AnswerSheetSvg
              layout={sheet.layout}
              qr={sheet.qr}
              title={exam.title}
              setLabel={set.label}
              classLabel={classText(exam.class)}
              dateText={prettyDate(exam.exam_date)}
            />
          </div>
        </div>
      ) : null}
    </div>
  );
}