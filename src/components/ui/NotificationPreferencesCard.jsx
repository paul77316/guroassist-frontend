import { useState } from 'react';
import { useNotificationPreferences, useSaveNotificationPreferences } from '../../hooks/useNotifications';
import { firstError } from '../../utils/errors';

/**
 * Settings card for the in-app reminder bell. Each switch saves as soon as it is changed,
 * separately from the attendance settings form above it.
 */
export default function NotificationPreferencesCard() {
  const { data, isLoading, isError, error } = useNotificationPreferences();
  const save = useSaveNotificationPreferences();
  const [saveError, setSaveError] = useState('');

  const change = (patch) => {
    setSaveError('');
    save.mutate(
      { in_app_enabled: data.in_app_enabled, include_students_to_review: data.include_students_to_review, ...patch },
      { onError: (err) => setSaveError(firstError(err, 'Could not save this setting.')) }
    );
  };

  return (
    <div className="mt-6 rounded-lg border border-gray-200 p-4">
      <h3 className="text-sm font-semibold text-gray-900">In-app reminders</h3>
      <p className="mt-1 text-xs text-gray-500">
        Show a bell at the top of the screen with follow-ups due and mobile attendance syncs grouped by class and attendance date. It only updates while
        GuroAssist is open, shows counts and never names or notes, and sends nothing by email or text. It is off
        until you switch it on.
      </p>

      {isLoading ? (
        <p className="mt-3 text-sm text-gray-500">Loading...</p>
      ) : isError ? (
        <p className="mt-3 text-sm text-red-600">{firstError(error, 'Could not load this setting.')}</p>
      ) : !data ? (
        <p className="mt-3 text-sm text-gray-500">Loading...</p>
      ) : (
        <div className="mt-3 space-y-2">
          <label className="flex items-center gap-2 text-sm text-gray-700">
            <input
              type="checkbox"
              checked={data.in_app_enabled}
              disabled={save.isPending}
              onChange={(e) => change({ in_app_enabled: e.target.checked })}
            />
            Show the reminder bell
          </label>
          <div className="ml-6">
            <label className={`flex items-center gap-2 text-sm ${data.in_app_enabled ? 'text-gray-700' : 'text-gray-400'}`}>
              <input
                type="checkbox"
                checked={data.include_students_to_review}
                disabled={!data.in_app_enabled || save.isPending}
                onChange={(e) => change({ include_students_to_review: e.target.checked })}
              />
              Also count students to review
            </label>
            <p className="ml-6 text-xs text-gray-400">
              This looks at attendance and missing work for all your classes, so it can take a moment longer.
            </p>
          </div>
          {save.isPending && <p className="text-xs text-gray-500">Saving...</p>}
          {saveError && <p className="text-sm text-red-600">{saveError}</p>}
        </div>
      )}
    </div>
  );
}
