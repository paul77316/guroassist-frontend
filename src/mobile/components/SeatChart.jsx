import { STATUS_META } from '../lib/constants';

const STATUS_STYLE = {
  present: 'border-green-600 bg-green-50',
  absent: 'border-red-600 bg-red-50',
  late: 'border-amber-500 bg-amber-50',
  excused: 'border-blue-600 bg-blue-50',
};
const BADGE_STYLE = {
  present: 'bg-green-600',
  absent: 'bg-red-600',
  late: 'bg-amber-600',
  excused: 'bg-blue-600',
};
const SYNC_TEXT = { pending: 'not synced', inflight: 'awaiting server', conflict: 'conflict', rejected: 'rejected' };

function Seat({ student, position, highlight, onPick }) {
  const marked = Boolean(student.status);
  const label = [
    position ? `Seat ${position}` : 'No seat',
    student.name,
    marked ? STATUS_META[student.status].label : 'not marked',
    student.syncState ? SYNC_TEXT[student.syncState] : null,
  ].filter(Boolean).join(', ');

  return (
    <button
      type="button"
      onClick={() => onPick(student)}
      aria-label={label}
      data-status={student.status ?? 'unmarked'}
      className={`mobile-seat flex min-h-16 min-w-0 flex-col items-center justify-center gap-1 rounded-lg border-2 px-1 py-1 text-center text-xs text-gray-900 active:scale-95 ${
        marked ? STATUS_STYLE[student.status] : 'border-dashed border-gray-400 bg-white'
      } ${!marked && highlight ? 'ring-4 ring-amber-400' : ''} ${student.syncState === 'conflict' || student.syncState === 'rejected' ? 'ring-4 ring-red-500' : ''}`}
    >
      {position && <span className="mobile-seat-position">{position}</span>}
      <span className="mobile-seat-name">{student.name}</span>
      <span className="flex items-center gap-1">
        <span className={`mobile-seat-mark rounded px-1.5 text-xs font-bold text-white ${marked ? BADGE_STYLE[student.status] : 'bg-gray-400'}`}>
          {marked ? STATUS_META[student.status].letter : '–'}
        </span>
        {student.syncState && <span aria-hidden="true" className="text-[10px] text-gray-600">{student.syncState === 'pending' ? '●' : '!'}</span>}
      </span>
    </button>
  );
}

export default function SeatChart({ students, layout, highlightUnmarked, onPick }) {
  const byId = new Map(students.map((s) => [s.studentId, s]));
  const cells = layout?.cells ?? [];
  const seated = new Set(cells.filter((id) => id !== null && byId.has(id)));
  const unseated = students.filter((s) => !seated.has(s.studentId));

  return (
    <div className="mobile-seat-card">
      {layout && cells.length > 0 ? (
        <>
          <p className="mobile-room-label">FRONT OF ROOM</p>
          <div className="mobile-seat-grid grid gap-1.5" style={{ gridTemplateColumns: `repeat(${layout.cols}, minmax(0, 1fr))` }} role="group" aria-label="Seating chart">
            {cells.map((id, index) => {
              const student = id !== null ? byId.get(id) : null;
              const position = `${Math.floor(index / layout.cols) + 1}-${(index % layout.cols) + 1}`;
              return student ? (
                <Seat key={index} student={student} position={position} highlight={highlightUnmarked} onPick={onPick} />
              ) : (
                <div key={index} className="min-h-16 rounded-lg border-2 border-dotted border-gray-300" aria-label={`Empty seat ${position}`} />
              );
            })}
          </div>
        </>
      ) : (
        <p className="rounded-lg border border-dashed border-gray-300 bg-slate-50 p-4 text-center text-sm leading-6 text-gray-600">
          No seating chart yet. Set one up on the web, or mark students from the list below.
        </p>
      )}

      {unseated.length > 0 && (
        <div className="mt-4">
          <h3 className="mobile-subsection-title">Students without a seat ({unseated.length})</h3>
          <div className="grid grid-cols-3 gap-1.5">
            {unseated.map((s) => <Seat key={s.studentId} student={s} position={null} highlight={highlightUnmarked} onPick={onPick} />)}
          </div>
        </div>
      )}
    </div>
  );
}
