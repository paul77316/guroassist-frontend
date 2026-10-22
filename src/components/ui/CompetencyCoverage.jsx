import { useState } from 'react';
import { useQueries } from '@tanstack/react-query';
import { getExamSet } from '../../services/examService';

/**
 * How many questions each competency has, per set and in total.
 * It is a planning aid for checking that the exam covers what was taught. Counts only.
 * The sets are loaded only when the panel is opened (they share the cache with the set tabs).
 */
export default function CompetencyCoverage({ exam }) {
  const [open, setOpen] = useState(false);
  const sets = exam.sets ?? [];

  const results = useQueries({
    queries: sets.map((s) => ({
      queryKey: ['exam-set', String(s.id)],
      queryFn: () => getExamSet(s.id),
      enabled: open,
      retry: false,
    })),
  });

  const loading = open && results.some((r) => r.isLoading);
  const failed = results.some((r) => r.isError);

  // competency name -> { counts per set id, total }
  const byName = new Map();
  const setTotals = {};
  let grand = 0;
  results.forEach((r, i) => {
    const setId = sets[i]?.id;
    (r.data?.questions ?? []).forEach((q) => {
      const name = q.competency?.name ?? 'No competency';
      const row = byName.get(name) ?? { name, counts: {}, total: 0 };
      row.counts[setId] = (row.counts[setId] ?? 0) + 1;
      row.total += 1;
      byName.set(name, row);
      setTotals[setId] = (setTotals[setId] ?? 0) + 1;
      grand += 1;
    });
  });
  const rows = [...byName.values()].sort((a, b) => a.name.localeCompare(b.name));

  return (
    <details
      className="mt-6 rounded-lg border border-gray-200 bg-white p-3"
      onToggle={(e) => setOpen(e.currentTarget.open)}
    >
      <summary className="cursor-pointer text-sm font-medium text-gray-800">Competency coverage</summary>

      {!open ? null : loading ? (
        <p className="py-4 text-center text-sm text-gray-500">Loading...</p>
      ) : failed ? (
        <p className="py-4 text-center text-sm text-red-600">Could not load every set. Close and open this panel to try again.</p>
      ) : rows.length === 0 ? (
        <p className="py-4 text-center text-sm text-gray-500">No questions yet.</p>
      ) : (
        <div className="mt-3">
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 text-left text-xs uppercase tracking-wide text-gray-500">
                  <th className="py-1.5 pr-4 font-semibold">Competency</th>
                  {sets.map((s) => <th key={s.id} className="px-3 py-1.5 text-right font-semibold">Set {s.label}</th>)}
                  <th className="px-3 py-1.5 text-right font-semibold">Total</th>
                  <th className="px-3 py-1.5 text-right font-semibold">Share</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.name} className="border-b border-gray-100 text-gray-800">
                    <td className="py-1.5 pr-4">{r.name}</td>
                    {sets.map((s) => <td key={s.id} className="px-3 py-1.5 text-right">{r.counts[s.id] ?? 0}</td>)}
                    <td className="px-3 py-1.5 text-right font-medium">{r.total}</td>
                    <td className="px-3 py-1.5 text-right text-gray-500">{Math.round((r.total / grand) * 100)}%</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="text-gray-900">
                  <td className="py-1.5 pr-4 font-semibold">All competencies</td>
                  {sets.map((s) => <td key={s.id} className="px-3 py-1.5 text-right font-semibold">{setTotals[s.id] ?? 0}</td>)}
                  <td className="px-3 py-1.5 text-right font-semibold">{grand}</td>
                  <td className="px-3 py-1.5 text-right text-gray-500">100%</td>
                </tr>
              </tfoot>
            </table>
          </div>
          <p className="mt-2 text-xs text-gray-500">
            Counts of the questions you have written, as a planning aid. Share is each competency&apos;s part of all
            questions in the exam.
          </p>
        </div>
      )}
    </details>
  );
}