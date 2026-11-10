import { useMemo, useRef, useState } from 'react';
import mobileApi from '../lib/mobileApi';
import { aggregateSheet, mergeSheetCounts, LETTERS } from './scannerCore';
import { readSheetToken, scanAnswerSheet } from '../lib/examScanner';

export default function ExamScanScreen({ onBack, onAuthProblem }) {
  const inputRef = useRef(null);
  const [manifest, setManifest] = useState(null);
  const [batches, setBatches] = useState([]);
  const [totals, setTotals] = useState([]);
  const [sheetCount, setSheetCount] = useState(0);
  const [reviewedCount, setReviewedCount] = useState(0);
  const [review, setReview] = useState(null);
  const [duplicateConfirmed, setDuplicateConfirmed] = useState(false);
  const [batchId, setBatchId] = useState(() => crypto.randomUUID());
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const unresolved = useMemo(() => review?.answers.some((answer) => !answer.value && answer.kind !== 'blank' && answer.kind !== 'multiple'), [review]);

  const loadBatches = async (token) => {
    const response = await mobileApi.get(`/exam-scan/sets/${encodeURIComponent(token)}/batches`);
    setBatches(response.data.data);
  };

  const onFile = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    setLoading(true); setError(''); setMessage('');
    try {
      const token = await readSheetToken(file);
      let current = manifest;
      if (!current || current.qr_token !== token) {
        const response = await mobileApi.get(`/exam-scan/sets/${encodeURIComponent(token)}`);
        current = { ...response.data.data, qr_token: token };
        setManifest(current);
        setTotals([]); setSheetCount(0); setReviewedCount(0); setBatchId(crypto.randomUUID());
        await loadBatches(token);
      }
      const { answers } = await scanAnswerSheet(file, current.exam.choice_count, current.questions);
      const mapped = answers.map((answer) => ({
        ...answer,
        kind: answer.kind === 'choice' ? 'choice' : answer.kind,
        value: answer.kind === 'choice' ? answer.value : answer.kind === 'blank' || answer.kind === 'multiple' ? answer.kind : '',
      }));
      setReview({ answers: mapped, questions: current.questions });
    } catch (err) {
      onAuthProblem?.(err);
      setError(err?.errors?.qr_token?.[0] ?? err?.message ?? 'Could not read this answer sheet.');
    } finally {
      setLoading(false);
    }
  };

  const setAnswer = (index, value) => {
    setReview((current) => ({ ...current, answers: current.answers.map((answer, i) => i === index ? { ...answer, value, kind: value === 'blank' || value === 'multiple' ? value : 'choice' } : answer) }));
  };

  const acceptSheet = () => {
    if (!review || unresolved) return;
    const answers = review.answers.map((answer) => ({ kind: answer.value === 'blank' ? 'blank' : answer.value === 'multiple' ? 'multiple' : 'choice', value: answer.value }));
    const rows = aggregateSheet(review.questions, answers, manifest.exam.choice_count);
    const reviewed = review.answers.filter((answer) => answer.confidence === 'review').length;
    setTotals((current) => mergeSheetCounts(current, rows));
    setSheetCount((count) => count + 1);
    setReviewedCount((count) => count + reviewed);
    setReview(null);
    setMessage('Sheet added to this unsaved class total. The image was discarded.');
  };

  const saveBatch = async () => {
    if (!manifest || sheetCount < 1 || !duplicateConfirmed) return;
    setSaving(true); setError(''); setMessage('');
    try {
      await mobileApi.post('/exam-scan/batches', {
        qr_token: manifest.qr_token,
        structure_hash: manifest.structure_hash,
        client_batch_id: batchId,
        sheet_count: sheetCount,
        reviewed_mark_count: reviewedCount,
        duplicate_check_confirmed: true,
        questions: totals,
      });
      await loadBatches(manifest.qr_token);
      setTotals([]); setSheetCount(0); setReviewedCount(0); setDuplicateConfirmed(false); setBatchId(crypto.randomUUID());
      setMessage('Class totals saved. No student answers or sheet images were stored.');
    } catch (err) {
      onAuthProblem?.(err);
      setError(err?.errors?.structure_hash?.[0] ?? err?.errors?.client_batch_id?.[0] ?? err?.message ?? 'Could not save these totals.');
    } finally {
      setSaving(false);
    }
  };

  const deleteBatch = async (batch) => {
    if (!window.confirm(`Delete this batch of ${batch.sheet_count} sheets and its class totals?`)) return;
    try {
      await mobileApi.delete(`/exam-scan/batches/${batch.id}`);
      await loadBatches(manifest.qr_token);
      setMessage('Scan batch deleted.');
    } catch (err) {
      onAuthProblem?.(err);
      setError(err?.message ?? 'Could not delete this batch.');
    }
  };

  const clearDraft = () => {
    setTotals([]); setSheetCount(0); setReviewedCount(0); setDuplicateConfirmed(false); setBatchId(crypto.randomUUID()); setReview(null);
  };

  return (
    <main className="mx-auto max-w-lg p-4 pb-8">
      <header className="flex items-center justify-between gap-2">
        <div><p className="text-xs font-semibold uppercase text-blue-700">GuroAssist</p><h1 className="text-xl font-bold text-gray-900">Exam sheet scanner</h1></div>
        <button onClick={onBack} className="min-h-11 rounded-lg border border-gray-300 px-3 text-sm">Back</button>
      </header>
      <p className="mt-2 text-sm text-gray-700">Scan printed answer sheets to make class totals. Student names, sheet photos, and individual answers are not saved.</p>
      {error && <p role="alert" className="mt-3 rounded-lg bg-red-50 p-3 text-sm text-red-900">{error}</p>}
      {message && <p role="status" className="mt-3 rounded-lg bg-blue-50 p-3 text-sm text-blue-900">{message}</p>}

      <input ref={inputRef} type="file" accept="image/*" capture="environment" onChange={onFile} className="sr-only" aria-label="Take or choose an answer sheet photo" />
      <button onClick={() => inputRef.current?.click()} disabled={loading || !!review} className="mt-4 min-h-14 w-full rounded-xl bg-blue-700 px-4 text-base font-semibold text-white disabled:opacity-50">
        {loading ? 'Reading sheet...' : 'Scan answer sheet'}
      </button>
      <p className="mt-2 text-xs text-gray-600">Use a clear, straight photo with all four black corner marks and the QR code visible. Scanning needs a connection to load the answer key.</p>

      {manifest && <section className="mt-4 rounded-xl border border-gray-200 p-3">
        <h2 className="font-semibold text-gray-900">{manifest.exam.title} - {manifest.set.label}</h2>
        <p className="mt-1 text-sm text-gray-700">{manifest.questions.length} questions · {manifest.exam.choice_count} choices</p>
        {batches.length > 0 && <div className="mt-3">
          <h3 className="text-sm font-semibold">Saved batches for this set</h3>
          <ul className="mt-1 space-y-2">{batches.map((batch) => <li key={batch.id} className="flex items-center justify-between gap-2 rounded-lg bg-gray-50 p-2 text-sm">
            <span>{batch.sheet_count} sheets · {new Date(batch.created_at).toLocaleString()}</span><button onClick={() => deleteBatch(batch)} className="min-h-10 rounded border border-red-300 px-2 text-red-800">Delete</button>
          </li>)}</ul>
        </div>}
        <p className="mt-3 text-sm font-medium">Current draft: {sheetCount} sheets · {reviewedCount} marks reviewed</p>
        {sheetCount > 0 && <>
          <label className="mt-3 flex items-start gap-2 text-sm text-gray-800"><input type="checkbox" checked={duplicateConfirmed} onChange={(event) => setDuplicateConfirmed(event.target.checked)} className="mt-1 h-4 w-4" />I checked that these sheets are not already included in another saved batch.</label>
          <div className="mt-3 flex gap-2"><button onClick={saveBatch} disabled={saving || !duplicateConfirmed} className="min-h-12 flex-1 rounded-lg bg-green-700 px-3 text-sm font-semibold text-white disabled:opacity-50">{saving ? 'Saving...' : 'Save class totals'}</button><button onClick={() => window.confirm('Discard this unsaved class total?') && clearDraft()} className="min-h-12 rounded-lg border px-3 text-sm">Discard</button></div>
        </>}
      </section>}

      {review && <section className="mt-4 rounded-xl border-2 border-amber-400 bg-amber-50 p-3" aria-label="Review uncertain marks">
        <h2 className="font-bold text-amber-950">Review this sheet</h2><p className="mt-1 text-sm text-amber-900">Check each uncertain mark. Nothing is added until you confirm this review.</p>
        <div className="mt-3 max-h-[55vh] space-y-2 overflow-auto">{review.answers.map((answer, index) => <div key={answer.question_id} className="rounded-lg bg-white p-2">
          <p className="text-sm font-medium">Question {review.questions[index].position}{answer.confidence === 'review' ? ' - Needs review' : ` - ${answer.value}`}</p>
          {answer.confidence === 'review' && <div className="mt-2 grid grid-cols-3 gap-1">{[...LETTERS.slice(0, manifest.exam.choice_count), 'blank', 'multiple'].map((value) => <button key={value} onClick={() => setAnswer(index, value)} aria-pressed={answer.value === value} className={`min-h-10 rounded border px-1 text-sm ${answer.value === value ? 'border-blue-700 bg-blue-100 font-bold' : 'border-gray-300'}`}>{value === 'blank' ? 'Blank' : value === 'multiple' ? 'Multiple' : value}</button>)}</div>}
        </div>)}</div>
        <div className="mt-3 flex gap-2"><button onClick={acceptSheet} disabled={unresolved} className="min-h-12 flex-1 rounded-lg bg-blue-700 px-3 text-sm font-semibold text-white disabled:opacity-50">Confirm and add sheet</button><button onClick={() => setReview(null)} className="min-h-12 rounded-lg border border-gray-400 px-3 text-sm">Discard sheet</button></div>
      </section>}
    </main>
  );
}
