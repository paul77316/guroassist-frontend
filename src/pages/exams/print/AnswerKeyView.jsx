import { prettyDate } from '../../../utils/dates';
import { classText, answerLetter } from './printHelpers';

/** Teacher copy: the correct letter for each number. Not for students. */
export default function AnswerKeyView({ exam, set, questions }) {
  return (
    <div
      className="mx-auto bg-white p-6 shadow print:p-0 print:shadow-none"
      style={{ maxWidth: '180mm', fontFamily: 'Arial, Helvetica, sans-serif', fontSize: '11pt', color: '#000' }}
    >
      <h1 style={{ fontSize: '15pt', fontWeight: 'bold', margin: 0 }}>Answer key - Set {set.label}</h1>
      <p style={{ margin: '1mm 0 0' }}>
        {exam.title} - {classText(exam.class)} - {prettyDate(exam.exam_date)}
      </p>
      <p style={{ margin: '1mm 0 5mm', fontSize: '9pt', color: '#555' }}>Teacher copy. Keep this page private.</p>

      <ol style={{ listStyle: 'none', margin: 0, padding: 0, display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '2mm 6mm' }}>
        {questions.map((q) => (
          <li key={q.id} style={{ breakInside: 'avoid' }}>
            <span style={{ display: 'inline-block', minWidth: '8mm', textAlign: 'right', marginRight: '2mm' }}>{q.position}.</span>
            <strong>{answerLetter(q.correct_choice, exam.choice_count)}</strong>
          </li>
        ))}
      </ol>
    </div>
  );
}