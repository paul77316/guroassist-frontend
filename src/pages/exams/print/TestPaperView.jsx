import { useCallback, useEffect, useState } from 'react';
import MathText from '../../../components/ui/MathText';
import { useQuestionImage } from '../../../hooks/useExams';
import { prettyDate } from '../../../utils/dates';
import { LETTERS } from './sheetLayout';
import { classText, normalizeChoices } from './printHelpers';

/** One question image. Tells the page when it has loaded (or failed) so Print can wait for it. */
function PrintImage({ question, onSettled }) {
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
    if (isError) onSettled(question.id);
  }, [isError, onSettled, question.id]);

  if (isError) return <p style={{ fontSize: '9pt' }}>The image could not be loaded.</p>;
  if (!url) return <p style={{ fontSize: '9pt', color: '#666' }}>Loading image...</p>;

  return (
    <img
      src={url}
      alt={question.image_alt ?? ''}
      onLoad={() => onSettled(question.id)}
      onError={() => onSettled(question.id)}
      style={{ maxHeight: '70mm', maxWidth: '100%', objectFit: 'contain' }}
    />
  );
}

/** The printable test paper for one set. Reports through onReadyChange when images and fonts are loaded. */
export default function TestPaperView({ exam, set, questions, onReadyChange }) {
  const [fontsReady, setFontsReady] = useState(false);
  const [settled, setSettled] = useState(() => new Set());

  const markSettled = useCallback((id) => {
    setSettled((prev) => (prev.has(id) ? prev : new Set(prev).add(id)));
  }, []);

  // Wait one paint so the math fonts are requested, then wait for them.
  useEffect(() => {
    let alive = true;
    const done = () => { if (alive) setFontsReady(true); };
    const fonts = typeof document !== 'undefined' ? document.fonts : null;
    if (!fonts || !fonts.ready) {
      done();
      return () => { alive = false; };
    }
    const raf = requestAnimationFrame(() => requestAnimationFrame(() => { fonts.ready.then(done, done); }));
    return () => { alive = false; cancelAnimationFrame(raf); };
  }, []);

  const pending = questions.filter((q) => q.has_image && !settled.has(q.id)).length;
  const ready = fontsReady && pending === 0;

  useEffect(() => {
    onReadyChange(ready);
    return () => onReadyChange(false);
  }, [ready, onReadyChange]);

  return (
    <div
      className="mx-auto bg-white p-6 shadow print:p-0 print:shadow-none"
      style={{ maxWidth: '180mm', fontFamily: 'Arial, Helvetica, sans-serif', fontSize: '11pt', lineHeight: 1.35, color: '#000' }}
    >
      <header style={{ marginBottom: '6mm' }}>
        <h1 style={{ fontSize: '15pt', fontWeight: 'bold', textAlign: 'center', margin: 0 }}>{exam.title}</h1>
        <p style={{ textAlign: 'center', margin: '1mm 0 0' }}>
          {classText(exam.class)} - {prettyDate(exam.exam_date)} - Set {set.label}
        </p>
        <div style={{ display: 'flex', gap: '8mm', marginTop: '6mm' }}>
          <span style={{ flex: 2, display: 'flex', gap: '2mm' }}>
            Name: <span style={{ flex: 1, borderBottom: '1px solid #000' }} />
          </span>
          <span style={{ flex: 1, display: 'flex', gap: '2mm' }}>
            Section: <span style={{ flex: 1, borderBottom: '1px solid #000' }} />
          </span>
        </div>
        <p style={{ marginTop: '5mm', fontStyle: 'italic' }}>
          Read each question carefully. Choose the letter of the best answer and shade the matching circle on your answer sheet.
        </p>
      </header>

      <ol style={{ listStyle: 'none', margin: 0, padding: 0 }}>
        {questions.map((q) => {
          const choices = normalizeChoices(q.choices, exam.choice_count);
          return (
            <li key={q.id} style={{ breakInside: 'avoid', pageBreakInside: 'avoid', marginBottom: '5mm' }}>
              <div style={{ display: 'flex', gap: '2mm' }}>
                <span style={{ minWidth: '8mm', fontWeight: 'bold' }}>{q.position}.</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div><MathText text={q.body} /></div>
                  {q.has_image && (
                    <div style={{ margin: '2mm 0' }}>
                      <PrintImage question={q} onSettled={markSettled} />
                    </div>
                  )}
                  <div style={{ marginTop: '1.5mm' }}>
                    {choices.map((c, i) => (
                      <div key={LETTERS[i]} style={{ display: 'flex', gap: '2mm', marginTop: '0.8mm' }}>
                        <span style={{ minWidth: '6mm' }}>{LETTERS[i]}.</span>
                        <span style={{ flex: 1, minWidth: 0 }}><MathText text={c} /></span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
}