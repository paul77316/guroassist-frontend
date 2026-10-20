const styles = {
  active: 'bg-green-100 text-green-700',
  draft: 'bg-gray-100 text-gray-600',
  archived: 'bg-gray-100 text-gray-500',
  upcoming: 'bg-blue-100 text-blue-700',
  completed: 'bg-gray-100 text-gray-600',
  locked: 'bg-amber-100 text-amber-700',
};

export default function Badge({ kind, children }) {
  return (
    <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${styles[kind] ?? styles.draft}`}>
      {children ?? kind}
    </span>
  );
}