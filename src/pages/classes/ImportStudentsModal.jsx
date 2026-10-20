import { useState } from 'react';
import Modal from '../../components/ui/Modal';
import { useImportStudents } from '../../hooks/useClassStudents';
import { downloadImportTemplate } from '../../services/classService';
import { saveBlob } from '../../utils/download';

const ACTION = {
  create: { label: 'New', cls: 'bg-green-100 text-green-700' },
  enroll: { label: 'Add', cls: 'bg-blue-100 text-blue-700' },
  already: { label: 'In class', cls: 'bg-gray-100 text-gray-600' },
  error: { label: 'Skipped', cls: 'bg-red-100 text-red-700' }, 
};

const firstError = (err) =>
  Object.values(err?.errors ?? {}).flat()[0] ?? err?.message ?? 'Something went wrong.';

export default function ImportStudentsModal({ cls, onClose }) {
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const imp = useImportStudents(cls.id);

  const pickFile = (e) => {
    setFile(e.target.files?.[0] ?? null);
    setPreview(null);
    setResult(null);
    setError('');
  };

  const run = (confirm) => {
    setError('');
    imp.mutate(
      { file, confirm },
      {
        onSuccess: (data) => (confirm ? setResult(data) : setPreview(data)),
        onError: (err) => setError(firstError(err)),
      }
    );
  };

  const template = async () => {
    try {
      saveBlob(await downloadImportTemplate(), 'student-import-template.csv');
    } catch {
      setError('Could not download the template.');
    }
  };

  const importable = preview ? preview.counts.create + preview.counts.enroll : 0;
  const shown = result ?? preview;

  return (
    <Modal title="Import students from CSV" onClose={onClose} maxWidth="max-w-2xl">
      {!result && (
        <>
          <p className="text-sm text-gray-600">
            Upload a CSV with a header row. Existing students are matched by <strong>student_id</strong> and
            added to this class; new ones are created. Dates: 2013-05-20 or 5/20/2013. Sex: male or female.
            Up to 500 rows. Columns include guardian_email (optional) for attendance notices if you turn them on in Settings.
          </p>
          <button onClick={template} className="mt-2 text-sm text-blue-600 hover:underline">
            Download template
          </button>

          <div className="mt-3">
            <input type="file" accept=".csv,text/csv" onChange={pickFile} className="block w-full text-sm" />
          </div>

          <div className="mt-3">
            <button
              onClick={() => run(false)}
              disabled={!file || imp.isPending}
              className="rounded-md border border-gray-300 px-4 py-2 text-sm hover:bg-gray-50 disabled:opacity-50"
            >
              {imp.isPending && !preview ? 'Checking…' : 'Preview'}
            </button>
          </div>
        </>
      )}

      {result && (
        <p className="rounded-md bg-green-50 p-3 text-sm text-green-800">
          Done. {result.created} new {result.created === 1 ? 'student' : 'students'} created,{' '}
          {result.enrolled} added to this class, {result.counts.already} already in the class,{' '}
          {result.counts.error} skipped.
        </p>
      )}

      {shown && (
        <div className="mt-4">
          {!result && (
            <p className="mb-2 text-sm text-gray-600">
              {shown.counts.create} new · {shown.counts.enroll} existing to add · {shown.counts.already} already
              in class · {shown.counts.error} will be skipped
            </p>
          )}
          <div className="max-h-64 overflow-y-auto rounded-md border border-gray-200">
            <table className="w-full text-left text-xs">
              <thead className="sticky top-0 bg-gray-50 text-gray-500">
                <tr>
                  <th className="px-3 py-1.5">Row</th>
                  <th className="px-3 py-1.5">Student ID</th>
                  <th className="px-3 py-1.5">Name</th>
                  <th className="px-3 py-1.5">Result</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {shown.rows.map((r) => (
                  <tr key={r.row}>
                    <td className="px-3 py-1.5 text-gray-500">{r.row}</td>
                    <td className="px-3 py-1.5">{r.student_id}</td>
                    <td className="px-3 py-1.5">{r.name || '—'}</td>
                    <td className="px-3 py-1.5">
                      <span className={`mr-2 rounded-full px-2 py-0.5 ${ACTION[r.action].cls}`}>
                        {ACTION[r.action].label}
                      </span>
                      <span className="text-gray-600">{r.message}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {error && <p className="mt-3 text-sm text-red-600">{error}</p>}

      <div className="mt-4 flex justify-end gap-2">
        <button onClick={onClose} className="rounded-md border px-4 py-2 text-sm">
          {result ? 'Close' : 'Cancel'}
        </button>
        {preview && !result && (
          <button
            onClick={() => run(true)}
            disabled={importable === 0 || imp.isPending}
            className="rounded-md bg-blue-600 px-4 py-2 text-sm text-white disabled:opacity-50"
          >
            {imp.isPending ? 'Importing…' : `Import ${importable} student${importable === 1 ? '' : 's'}`}
          </button>
        )}
      </div>
    </Modal>
  );
}