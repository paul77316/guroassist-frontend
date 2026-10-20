/**
 * Shown under a review prompt on the Attendance and Missing work reports.
 * active: { active_count, follow_up_due } for the student, or undefined when there is none.
 * Starting an intervention only opens the form; nothing is saved until the teacher saves it.
 */
export default function ReviewActions({ active, onStart }) {
  return (
    <div className="mt-2 flex flex-wrap items-center gap-2">
      {active?.active_count > 0 && (
        <span className="inline-block rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-700">
          Intervention active
        </span>
      )}
      {active?.follow_up_due && <span className="text-xs text-amber-700">Follow-up due</span>}
      <button
        type="button"
        onClick={onStart}
        className="rounded-md border border-gray-300 px-2.5 py-1 text-xs hover:bg-gray-50"
      >
        Start intervention
      </button>
    </div>
  );
}
