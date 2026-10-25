import { useEffect, useMemo, useState } from 'react';
import { useClasses } from '../../hooks/useClasses';
import { useSaveSeatingLayout, useSeatingLayout } from '../../hooks/useAttendance';
import AttendanceTabs from '../../components/ui/AttendanceTabs';
import { firstError } from '../../utils/errors';

const SIZES = [3, 4, 5, 6, 7, 8, 9, 10];

export default function SeatingPage() {
  const { data: classes = [], isLoading: classesLoading } = useClasses();
  const [classId, setClassId] = useState('');
  const [draft, setDraft] = useState(null); // { rows, cols, cells }
  const [selected, setSelected] = useState(null); // { type: 'student', id } | { type: 'seat', index }
  const [dirty, setDirty] = useState(false);
  const [message, setMessage] = useState(null);
  const { data, isLoading, isError } = useSeatingLayout(classId);
  const save = useSaveSeatingLayout();

  useEffect(() => {
    if (!classId && classes.length > 0) setClassId(String(classes[0].id));
  }, [classes, classId]);

  useEffect(() => {
    if (!data) return;
    setDraft({ rows: data.rows, cols: data.cols, cells: [...data.cells] });
    setSelected(null);
    setDirty(false);
  }, [data]);

  useEffect(() => {
    if (!dirty) return undefined;
    const handler = (e) => { e.preventDefault(); e.returnValue = ''; };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [dirty]);

  const students = data?.students ?? [];
  const nameOf = useMemo(() => new Map(students.map((s) => [s.student_id, s.full_name])), [students]);
  const seated = new Set((draft?.cells ?? []).filter((id) => id !== null));
  const unassigned = students.filter((s) => !seated.has(s.student_id));

  const edit = (next) => { setDraft(next); setDirty(true); setMessage(null); };

  const place = (target) => {
    if (!draft) return;
    const cells = [...draft.cells];
    if (selected?.type === 'student') {
      cells.forEach((id, i) => { if (id === selected.id) cells[i] = null; });
      cells[target] = selected.id;
      setSelected(null);
      edit({ ...draft, cells });
    } else if (selected?.type === 'seat') {
      if (selected.index !== target) {
        [cells[selected.index], cells[target]] = [cells[target], cells[selected.index]];
        edit({ ...draft, cells });
      }
      setSelected(null);
    } else if (cells[target] !== null) {
      setSelected({ type: 'seat', index: target });
    }
  };

  const drop = (source, target) => {
    const cells = [...draft.cells];
    if (source.type === 'student') {
      cells.forEach((id, i) => { if (id === source.id) cells[i] = null; });
      cells[target] = source.id;
    } else {
      [cells[source.index], cells[target]] = [cells[target], cells[source.index]];
    }
    setSelected(null);
    edit({ ...draft, cells });
  };

  const resize = (rows, cols) => {
    const cells = Array(rows * cols).fill(null);
    let lost = 0;
    draft.cells.forEach((id, i) => {
      if (id === null) return;
      const r = Math.floor(i / draft.cols);
      const c = i % draft.cols;
      if (r < rows && c < cols) cells[r * cols + c] = id; else lost += 1;
    });
    if (lost > 0) {
      setMessage({ tone: 'error', text: `Can’t shrink: ${lost} seated student(s) would lose their seat. Move or remove them first.` });
      return;
    }
    setSelected(null);
    edit({ rows, cols, cells });
  };

  const handleSave = () => {
    save.mutate(
      { classId, version: data.version, rows: draft.rows, cols: draft.cols, cells: draft.cells },
      {
        onSuccess: () => {
          setDirty(false);
          const left = students.length - seated.size;
          setMessage({ tone: 'ok', text: `Saved.${left > 0 ? ` ${left} student(s) still have no seat and appear in the phone’s “without a seat” list.` : ''} Phones get the new chart the next time they open the class online.` });
        },
      },
    );
  };

  const saveError = save.isError
    ? (save.error?.status === 409
      ? 'Someone changed this chart after you opened it. It was reloaded. Review it and save again.'
      : firstError(save.error, 'Could not save the seating chart.'))
    : null;

  return (
    <div>
      <h2 className="text-lg font-semibold text-gray-900">Attendance</h2>
      <p className="mt-1 text-sm text-gray-500">Arrange students on the seating chart. The mobile app shows this chart for taking attendance.</p>
      <AttendanceTabs />

      {classesLoading ? (
        <div className="mt-6 text-sm text-gray-500">Loading classes…</div>
      ) : classes.length === 0 ? (
        <div className="mt-6 rounded-lg border border-dashed border-gray-300 p-8 text-center text-sm text-gray-500">No classes yet.</div>
      ) : (
        <>
          <div className="mt-6 flex flex-wrap items-end gap-4">
            <div>
              <label htmlFor="seat-class" className="mb-1 block text-sm font-medium text-gray-700">Class</label>
              <select
                id="seat-class"
                value={classId}
                onChange={(e) => { if (!dirty || window.confirm('Discard unsaved seating changes?')) setClassId(e.target.value); }}
                className="rounded-md border border-gray-300 px-3 py-2 text-sm"
              >
                {classes.map((c) => <option key={c.id} value={c.id}>{c.grade_level} - {c.section} ({c.subject})</option>)}
              </select>
            </div>
            {draft && (
              <>
                <div>
                  <label htmlFor="seat-rows" className="mb-1 block text-sm font-medium text-gray-700">Rows</label>
                  <select id="seat-rows" value={draft.rows} onChange={(e) => resize(Number(e.target.value), draft.cols)} className="rounded-md border border-gray-300 px-3 py-2 text-sm">
                    {SIZES.map((n) => <option key={n} value={n}>{n}</option>)}
                  </select>
                </div>
                <div>
                  <label htmlFor="seat-cols" className="mb-1 block text-sm font-medium text-gray-700">Columns</label>
                  <select id="seat-cols" value={draft.cols} onChange={(e) => resize(draft.rows, Number(e.target.value))} className="rounded-md border border-gray-300 px-3 py-2 text-sm">
                    {SIZES.map((n) => <option key={n} value={n}>{n}</option>)}
                  </select>
                </div>
              </>
            )}
          </div>

          {isLoading && <div className="mt-6 text-sm text-gray-500">Loading seating chart…</div>}
          {isError && <div className="mt-6 text-sm text-red-600">Could not load the seating chart.</div>}

          {draft && (
            <div className="mt-6 grid gap-4 md:grid-cols-[14rem_1fr]">
              <section aria-label="Students without a seat" className="rounded-lg border border-gray-200 bg-white p-3">
                <h3 className="mb-2 text-sm font-semibold text-gray-900">No seat yet ({unassigned.length})</h3>
                <div className="flex max-h-80 flex-col gap-1.5 overflow-y-auto">
                  {unassigned.length === 0 && <p className="text-sm text-gray-500">Everyone has a seat.</p>}
                  {unassigned.map((s) => {
                    const active = selected?.type === 'student' && selected.id === s.student_id;
                    return (
                      <button
                        key={s.student_id}
                        type="button"
                        draggable
                        aria-pressed={active}
                        onDragStart={(e) => e.dataTransfer.setData('text/plain', `s${s.student_id}`)}
                        onClick={() => setSelected(active ? null : { type: 'student', id: s.student_id })}
                        className={`min-h-11 rounded-md border px-3 text-left text-sm ${active ? 'border-blue-600 bg-blue-50 ring-2 ring-blue-600' : 'border-gray-300 hover:bg-gray-50'}`}
                      >
                        {s.full_name}
                      </button>
                    );
                  })}
                </div>
              </section>

              <section aria-label="Seating chart" className="rounded-lg border border-gray-200 bg-white p-3">
                <p className="mb-2 border-b-2 border-gray-200 pb-1 text-center text-xs text-gray-500">FRONT OF ROOM</p>
                <p className="mb-2 text-xs text-gray-500">Select a student, then a seat. Select a seated student, then another seat, to move or swap. Dragging works too.</p>
                <div className="grid gap-1.5" style={{ gridTemplateColumns: `repeat(${draft.cols}, minmax(0, 1fr))` }}>
                  {draft.cells.map((id, i) => {
                    const isSel = selected?.type === 'seat' && selected.index === i;
                    const r = Math.floor(i / draft.cols) + 1;
                    const c = (i % draft.cols) + 1;
                    return (
                      <button
                        key={i}
                        type="button"
                        draggable={id !== null}
                        aria-label={`Row ${r} seat ${c}, ${id === null ? 'empty' : nameOf.get(id) ?? 'student'}${isSel ? ', selected' : ''}`}
                        onClick={() => place(i)}
                        onDragStart={(e) => e.dataTransfer.setData('text/plain', `c${i}`)}
                        onDragOver={(e) => e.preventDefault()}
                        onDrop={(e) => {
                          e.preventDefault();
                          const raw = e.dataTransfer.getData('text/plain');
                          if (raw) drop(raw[0] === 's' ? { type: 'student', id: Number(raw.slice(1)) } : { type: 'seat', index: Number(raw.slice(1)) }, i);
                        }}
                        className={`flex min-h-14 flex-col items-center justify-center rounded-md border-2 px-1 text-xs ${
                          id === null ? 'border-dotted border-gray-300 text-gray-400' : 'border-gray-400 text-gray-900'
                        } ${isSel ? 'bg-blue-50 ring-2 ring-blue-600' : ''}`}
                      >
                        <span className="text-[10px] text-gray-400">{r}-{c}</span>
                        <span className="w-full truncate text-center">{id === null ? 'Empty' : nameOf.get(id)}</span>
                      </button>
                    );
                  })}
                </div>

                <div className="mt-4 flex flex-wrap items-center justify-end gap-3">
                  {saveError && <span role="alert" className="text-sm text-red-600">{saveError}</span>}
                  {message && <span role="status" className={`text-sm ${message.tone === 'error' ? 'text-red-600' : 'text-green-700'}`}>{message.text}</span>}
                  {dirty && <span className="text-sm text-amber-600">Unsaved changes</span>}
                  <button
                    type="button"
                    disabled={!(selected?.type === 'seat')}
                    onClick={() => { const cells = [...draft.cells]; cells[selected.index] = null; setSelected(null); edit({ ...draft, cells }); }}
                    className="rounded-md border border-gray-300 px-3 py-2 text-sm disabled:opacity-40"
                  >
                    Remove from seat
                  </button>
                  <button type="button" onClick={handleSave} disabled={!dirty || save.isPending} className="rounded-md bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-700 disabled:opacity-50">
                    {save.isPending ? 'Saving…' : 'Save seating chart'}
                  </button>
                </div>
              </section>
            </div>
          )}
        </>
      )}
    </div>
  );
}
