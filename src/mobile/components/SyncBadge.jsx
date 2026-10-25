export default function SyncBadge({ summary, syncing, online, storageOk, authExpired }) {
  let tone = 'green';
  let text = 'All changes confirmed';
  let icon = '✓';

  if (!storageOk) { tone = 'red'; icon = '!'; text = 'Storage problem'; }
  else if (summary.corrupt > 0) { tone = 'red'; icon = '!'; text = 'Saved data unreadable'; }
  else if (summary.conflict > 0) { tone = 'red'; icon = '!'; text = `${summary.conflict} conflict${summary.conflict > 1 ? 's' : ''}`; }
  else if (summary.rejected > 0) { tone = 'red'; icon = '!'; text = `${summary.rejected} rejected`; }
  else if (syncing) { tone = 'amber'; icon = '↻'; text = 'Syncing…'; }
  else if (summary.inflight > 0) { tone = 'amber'; icon = '…'; text = `${summary.inflight} awaiting server`; }
  else if (summary.pending > 0) { tone = 'amber'; icon = '●'; text = `${summary.pending} not synced`; }

  const colors = {
    green: 'bg-green-100 text-green-800',
    amber: 'bg-amber-100 text-amber-900',
    red: 'bg-red-100 text-red-800',
  };

  return (
    <div className="flex flex-wrap items-center gap-2" role="status" aria-live="polite">
      <span className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-semibold ${colors[tone]}`}>
        <span aria-hidden="true">{icon}</span>
        {text}
      </span>
      {!online && <span className="rounded-full bg-gray-200 px-3 py-1 text-xs font-semibold text-gray-700">Offline</span>}
      {authExpired && <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-900">Sign in to sync</span>}
    </div>
  );
}
