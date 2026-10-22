import { StatusBadge, FollowUpBadge } from '../../components/ui/InterventionBadges';
import { FollowUpActions } from '../../components/ui/CommunicationFollowUp';
import { useDueFollowUps } from '../../hooks/useInterventions';
import { firstError } from '../../utils/errors';
import { prettyDate } from '../../utils/dates';
import { classLabel } from '../../utils/classLabel';


/**
 * Follow-ups that are due: interventions and parent-contact follow-ups in one list.
 * Rows carry no free text. An older response without "kind" is treated as an intervention.
 */
export default function DueFollowUpsSection({ onOpenIntervention, onOpenCommunication }) {
  const { data, isLoading, isError, error } = useDueFollowUps();
  const rows = data?.data ?? [];

  return (
    <section className="mt-10">
      <h3 className="text-sm font-semibold uppercase tracking-wide text-gray-500">Follow-ups due</h3>

      {isLoading ? (
        <p className="mt-4 text-sm text-gray-500">Loading...</p>
      ) : isError ? (
        <p className="mt-4 text-sm text-red-600">{firstError(error, 'Could not load your follow-ups.')}</p>
      ) : !data ? (
        <p className="mt-4 text-sm text-gray-500">Loading...</p>
      ) : rows.length === 0 ? (
        <p className="mt-4 rounded-lg border border-dashed border-gray-300 p-8 text-center text-sm text-gray-500">
          No follow-ups are due. You are up to date.
        </p>
      ) : (
        <div className="mt-4 overflow-x-auto rounded-lg border border-gray-200 bg-white">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-gray-50 text-xs uppercase text-gray-500">
              <tr>
                <th className="px-4 py-2">Student</th>
                <th className="px-4 py-2">Class</th>
                <th className="px-4 py-2">Concern or contact</th>
                <th className="px-4 py-2">Status</th>
                <th className="px-4 py-2">Follow-up</th>
                <th className="px-4 py-2" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {rows.map((r) => {
                const isContact = r.kind === 'communication';

                return (
                  <tr key={`${r.kind ?? 'intervention'}-${r.id}`} className={r.follow_up_state === 'overdue' ? 'bg-amber-50/50' : ''}>
                    <td className="whitespace-nowrap px-4 py-2">
                      <p className="font-medium text-gray-900">{r.student.full_name}</p>
                      <p className="text-xs text-gray-400">{r.student.student_number}</p>
                    </td>
                    <td className="px-4 py-2 text-gray-600">{r.class ? classLabel(r.class) : 'General'}</td>
                    <td className="px-4 py-2 text-gray-600">
                      {isContact ? (
                        <>
                          Parent contact
                          <span className="block text-xs text-gray-400">{r.method_label}</span>
                        </>
                      ) : (
                        r.concern_type_label
                      )}
                    </td>
                    <td className="px-4 py-2">
                      {isContact ? <span className="text-gray-300">-</span> : <StatusBadge status={r.status} label={r.status_label} />}
                    </td>
                    <td className="whitespace-nowrap px-4 py-2">
                      <FollowUpBadge state={r.follow_up_state} />
                      <span className="block text-xs text-gray-500">{prettyDate(r.follow_up_date)}</span>
                    </td>
                    <td className="px-4 py-2 text-right">
                      <div className="flex items-start justify-end gap-2">
                        {isContact && <FollowUpActions id={r.id} state={r.follow_up_state} />}
                        <button
                          onClick={() => (isContact ? onOpenCommunication(r.id) : onOpenIntervention(r.id))}
                          className="rounded-md border border-gray-300 px-3 py-1.5 text-sm hover:bg-gray-50"
                        >
                          Open
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <p className="mt-2 text-xs text-gray-500">
        An intervention stays here until you complete it or move its follow-up date. A parent contact stays here until
        you mark it done or change its follow-up date. Records in an archived class, or for students who are no longer
        in your classes, are not shown.
      </p>
    </section>
  );
}
