export default function ClassSelect({ classes, value, onChange }) {
  return (
    <div>
      <label className="mb-1 block text-sm font-medium text-gray-700">Class</label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="rounded-md border border-gray-300 px-3 py-2 text-sm"
      >
        {classes.map((c) => (
          <option key={c.id} value={c.id}>
            {c.grade_level} - {c.section} ({c.subject})
          </option>
        ))}
      </select>
    </div>
  );
}
