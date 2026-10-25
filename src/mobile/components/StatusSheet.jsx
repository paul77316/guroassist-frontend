import { useEffect, useRef } from 'react';
import { STATUSES, STATUS_META } from '../lib/constants';

const BTN = {
  present: 'border-green-600 text-green-800',
  absent: 'border-red-600 text-red-800',
  late: 'border-amber-600 text-amber-900',
  excused: 'border-blue-600 text-blue-800',
};

export default function StatusSheet({ student, onChoose, onClose }) {
  const ref = useRef(null);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (student && !dialog.open) dialog.showModal();
    if (!student && dialog.open) dialog.close();
  }, [student]);

  return (
    <dialog ref={ref} onClose={onClose} className="mobile-status-dialog m-auto w-[min(92vw,22rem)] rounded-2xl p-5 backdrop:bg-black/50">
      {student && (
        <>
          <h2 className="text-base font-semibold text-gray-900">{student.name}</h2>
          <div className="my-3 grid grid-cols-2 gap-2">
            {STATUSES.map((status) => (
              <button
                key={status}
                type="button"
                onClick={() => onChoose(status)}
                aria-pressed={student.status === status}
                className={`mobile-status-button min-h-14 border-2 text-sm ${BTN[status]} ${student.status === status ? 'bg-gray-100' : 'bg-white'}`}
              >
                {STATUS_META[status].letter} · {STATUS_META[status].label}
              </button>
            ))}
          </div>
          <button type="button" onClick={onClose} className="min-h-12 w-full rounded-lg border border-slate-300 bg-slate-50 text-sm font-semibold text-slate-700">Cancel</button>
        </>
      )}
    </dialog>
  );
}
