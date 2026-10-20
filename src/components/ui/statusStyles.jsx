export const STATUS = {
  submitted: { label: 'Submitted', cls: 'bg-green-100 text-green-700' },
  late: { label: 'Late', cls: 'bg-amber-100 text-amber-700' },
  excused: { label: 'Excused', cls: 'bg-blue-100 text-blue-700' },
  missing: { label: 'Missing', cls: 'bg-red-100 text-red-700' },
  not_yet: { label: 'Not yet submitted', cls: 'bg-gray-100 text-gray-600' },
  not_applicable: { label: 'Not applicable', cls: 'bg-gray-50 text-gray-400' },
};

export function StatusBadge({ status }) {
  const s = STATUS[status] ?? STATUS.not_yet;
  return <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${s.cls}`}>{s.label}</span>;
}
