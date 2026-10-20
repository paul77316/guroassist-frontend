import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import FormField, { inputCls } from '../../components/ui/FormField';
import { useMonitoringSettings, useSaveMonitoringSettings } from '../../hooks/useMonitoring';
import { applyServerErrors } from '../../utils/formErrors';
import NotificationPreferencesCard from '../../components/ui/NotificationPreferencesCard';

const num = (min, max, int = true) => {
  let s = z.coerce.number({ invalid_type_error: 'Enter a number' });
  if (int) s = s.int('Whole number');
  return s.min(min, `Min ${min}`).max(max, `Max ${max}`);
};

const schema = z.object({
  attendance_rate_threshold: num(1, 100, false),
  consecutive_absence_threshold: num(1, 30),
  min_days_for_rate: num(1, 60),
  missing_assignments_threshold: num(1, 50),
  guardian_email_enabled: z.boolean(),
  notify_on_absent: z.boolean(),
  notify_on_late: z.boolean(),
});
const FIELDS = Object.keys(schema.shape);

export default function SettingsPage() {
  const { data, isLoading, isError, error } = useMonitoringSettings();
  const save = useSaveMonitoringSettings();

  const { register, handleSubmit, reset, setError, watch, formState: { errors, isDirty } } = useForm({
    resolver: zodResolver(schema),
  });

  useEffect(() => { if (data) reset(data); }, [data, reset]);

  const emailOn = watch('guardian_email_enabled');

  const onSubmit = (values) => {
    save.mutate(values, { onError: (err) => applyServerErrors(err, setError, FIELDS) });
  };

  return (
    <div className="max-w-xl">
      <h2 className="text-lg font-semibold text-gray-900">Settings</h2>
      <p className="mt-1 text-sm text-gray-500">
        These thresholds decide when GuroAssist suggests a student for review. They are prompts for you to
        look at the record, never decisions about a student.
      </p>

      {isLoading ? (
        <p className="mt-6 text-sm text-gray-500">Loading settings…</p>
      ) : isError ? (
        <p className="mt-6 text-sm text-gray-600">
          {error?.message ?? 'Could not load settings.'}
        </p>
      ) : (
        <form onSubmit={handleSubmit(onSubmit)} className="mt-6 space-y-4">
          <FormField label="Attendance rate to review (%)" error={errors.attendance_rate_threshold?.message}
            hint="A student below this rate is suggested for review.">
            <input type="number" step="0.1" className={inputCls} {...register('attendance_rate_threshold')} />
          </FormField>
          <FormField label="Consecutive absences to review" error={errors.consecutive_absence_threshold?.message}
            hint="Absent this many class days in a row.">
            <input type="number" className={inputCls} {...register('consecutive_absence_threshold')} />
          </FormField>
          <FormField label="Recorded days needed before a rate is judged" error={errors.min_days_for_rate?.message}
            hint="Stops a rate from 2 days of data from raising a flag.">
            <input type="number" className={inputCls} {...register('min_days_for_rate')} />
          </FormField>
          <FormField label="Missing assignments to review" error={errors.missing_assignments_threshold?.message}
            hint="Used by assignment monitoring when it is added.">
            <input type="number" className={inputCls} {...register('missing_assignments_threshold')} />
          </FormField>

          <div className="rounded-lg border border-gray-200 p-4">
            <h3 className="text-sm font-semibold text-gray-900">Guardian email notices</h3>
            <p className="mt-1 text-xs text-gray-500">
              When you save attendance, GuroAssist emails the guardian of a student marked absent or late, if
              their email is on file. The email states the student's name, status, date, class, and your name,
              and nothing else. It is sent about 5 minutes after you save, so a correction in that time cancels
              it. Only attendance from the last 2 days is emailed. Make sure the school has the guardian's
              consent to be contacted by email.
            </p>

            <label className="mt-3 flex items-center gap-2 text-sm text-gray-700">
              <input type="checkbox" {...register('guardian_email_enabled')} />
              Email guardians about attendance
            </label>
            <div className="ml-6 mt-2 space-y-1">
              <label className={`flex items-center gap-2 text-sm ${emailOn ? 'text-gray-700' : 'text-gray-400'}`}>
                <input type="checkbox" disabled={!emailOn} {...register('notify_on_absent')} />
                When a student is absent
              </label>
              <label className={`flex items-center gap-2 text-sm ${emailOn ? 'text-gray-700' : 'text-gray-400'}`}>
                <input type="checkbox" disabled={!emailOn} {...register('notify_on_late')} />
                When a student is late
              </label>
            </div>
          </div>

          {errors.root && <p className="text-sm text-red-600">{errors.root.message}</p>}

          <div className="flex items-center gap-3 pt-2">
            <button type="submit" disabled={save.isPending || !isDirty}
              className="rounded-md bg-blue-600 px-4 py-2 text-sm text-white disabled:opacity-50">
              {save.isPending ? 'Saving…' : 'Save settings'}
            </button>
            {save.isSuccess && !isDirty && <span className="text-sm text-green-600">Saved.</span>}
          </div>
        </form>
      )}

      <NotificationPreferencesCard />
    </div>
  );
}