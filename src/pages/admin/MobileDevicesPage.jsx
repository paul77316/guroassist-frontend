import { useState } from 'react';
import { useApproveMobileDevice, useMobileDevices, useRevokeMobileDevice } from '../../hooks/useAdmin';
import { firstError } from '../../utils/errors';

const FILTERS = [
  { value: '', label: 'All' },
  { value: 'pending', label: 'Waiting for approval' },
  { value: 'approved', label: 'Approved' },
  { value: 'revoked', label: 'Removed' },
];
const BADGE = {
  pending: 'bg-amber-100 text-amber-800',
  approved: 'bg-green-100 text-green-800',
  revoked: 'bg-gray-200 text-gray-700',
};
const LABEL = { pending: 'Waiting', approved: 'Approved', revoked: 'Removed' };

const when = (iso) => (iso ? new Date(iso).toLocaleString() : '—');

export default function MobileDevicesPage() {
  const [status, setStatus] = useState('pending');
  const { data: devices = [], isLoading, isError } = useMobileDevices(status || undefined);
  const approve = useApproveMobileDevice();
  const revoke = useRevokeMobileDevice();
  const [error, setError] = useState(null);

  const run = (mutation, id, confirmText) => {
    if (confirmText && !window.confirm(confirmText)) return;
    setError(null);
    mutation.mutate(id, { onError: (e) => setError(firstError(e, 'That did not work.')) });
  };

  return (
    <div>
      <div className="mb-4">
        <h1 className="text-xl font-semibold text-gray-900">Mobile devices</h1>
        <p className="text-sm text-gray-500">
          A teacher can take attendance only on a phone you approve. Each teacher can have up to 2 approved phones.
          Removing a phone signs it out at once, and its saved attendance stays on the phone until it can sync.
        </p>
      </div>

      <div className="mb-3 flex flex-wrap gap-2" role="group" aria-label="Filter devices">
        {FILTERS.map((f) => (
          <button
            key={f.value}
            type="button"
            aria-pressed={status === f.value}
            onClick={() => setStatus(f.value)}
            className={`rounded-full border px-3 py-1.5 text-sm ${status === f.value ? 'border-blue-600 bg-blue-50 text-blue-700' : 'border-gray-300 text-gray-600 hover:bg-gray-50'}`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {error && <p role="alert" className="mb-3 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}

      <section className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
        {isLoading && <p className="p-6 text-sm text-gray-500">Loading devices…</p>}
        {isError && <p className="p-6 text-sm text-red-600">Could not load devices. Refresh and try again.</p>}
        {!isLoading && !isError && devices.length === 0 && <p className="p-6 text-sm text-gray-500">No devices here.</p>}
        {devices.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-gray-50 text-xs uppercase text-gray-500">
                <tr>
                  <th className="px-4 py-2">Teacher</th>
                  <th className="px-4 py-2">Device</th>
                  <th className="px-4 py-2">Status</th>
                  <th className="px-4 py-2">Registered</th>
                  <th className="px-4 py-2">Last used</th>
                  <th className="px-4 py-2 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {devices.map((d) => (
                  <tr key={d.id}>
                    <td className="px-4 py-2">
                      <p className="font-medium text-gray-900">{d.teacher.name}</p>
                      <p className="text-gray-500">{d.teacher.email}</p>
                    </td>
                    <td className="px-4 py-2">
                      <p className="text-gray-900">{d.device_name}</p>
                      <p className="max-w-56 truncate text-xs text-gray-500" title={d.user_agent ?? ''}>{d.last_ip ?? ''} {d.user_agent ?? ''}</p>
                    </td>
                    <td className="px-4 py-2"><span className={`rounded-full px-2.5 py-1 text-xs font-medium ${BADGE[d.status]}`}>{LABEL[d.status]}</span></td>
                    <td className="px-4 py-2 text-gray-600">{when(d.registered_at)}</td>
                    <td className="px-4 py-2 text-gray-600">{when(d.last_used_at)}</td>
                    <td className="space-x-3 px-4 py-2 text-right">
                      {d.status === 'pending' && (
                        <button onClick={() => run(approve, d.id)} disabled={approve.isPending} className="text-blue-600 hover:underline disabled:opacity-50">Approve</button>
                      )}
                      {d.status !== 'revoked' && (
                        <button
                          onClick={() => run(revoke, d.id, `Remove ${d.teacher.name}’s ${d.device_name}? It is signed out immediately and cannot be approved again.`)}
                          disabled={revoke.isPending}
                          className="text-red-600 hover:underline disabled:opacity-50"
                        >
                          {d.status === 'pending' ? 'Reject' : 'Remove'}
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
