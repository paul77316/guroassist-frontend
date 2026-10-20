import { useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useQueryClient } from '@tanstack/react-query';
import Modal from './Modal';
import FormField, { inputCls } from './FormField';
import { useAddFollowup, useInterventionOptions } from '../../hooks/useInterventions';
import { applyServerErrors } from '../../utils/formErrors';
import { todayLocal } from '../../utils/dates';

// The server decides the entry type and enforces every rule; these checks only save a round trip.
const makeSchema = () =>
  z
    .object({
      kind: z.enum(['followup', 'reschedule']),
      followup_date: z.string().min(1, 'Required'),
      to_status: z.string().optional(),
      progress: z.string().max(5000).optional(),
      notes: z.string().max(5000).optional(),
      next_follow_up_date: z.string().optional(),
      outcome: z.string().optional(),
    })
    .superRefine((v, ctx) => {
      const add = (path, message) => ctx.addIssue({ code: 'custom', path: [path], message });
      const notes = (v.notes ?? '').trim();

      if (v.kind === 'reschedule') {
        if (!v.next_follow_up_date) add('next_follow_up_date', 'Choose the new follow-up date');
      } else {
        if (v.to_status === 'completed' && !v.outcome) add('outcome', 'Choose an outcome to complete');
        if (v.to_status === 'requires_follow_up') {
          if (!notes) add('notes', 'Give a reason');
          if (!v.next_follow_up_date) add('next_follow_up_date', 'Choose the next follow-up date');
        }
      }

      const needsNext = v.kind === 'reschedule' || v.to_status !== 'completed';
      if (needsNext && v.next_follow_up_date && v.next_follow_up_date <= v.followup_date) {
        add('next_follow_up_date', 'Must be after the date of this entry');
      }
    });

const FIELDS = ['kind', 'followup_date', 'to_status', 'progress', 'notes', 'next_follow_up_date', 'outcome'];

/**
 * Record what happened on an intervention. The intervention (from the detail query) says which
 * statuses are allowed next. A completed intervention can only be reopened, and a reopen needs a reason.
 */
export default function FollowUpFormModal({ intervention, onClose, onSaved }) {
  const isReopen = intervention.status === 'completed';
  const { data: options, isError } = useInterventionOptions();

  return (
    <Modal title={isReopen ? 'Reopen intervention' : 'Record follow-up'} onClose={onClose} maxWidth="max-w-lg">
      {isError ? (
        <p className="py-6 text-center text-sm text-red-600">Could not load the form options.</p>
      ) : !options ? (
        <p className="py-6 text-center text-sm text-gray-500">Loading...</p>
      ) : (
        <FollowUpForm options={options} intervention={intervention} isReopen={isReopen} onClose={onClose} onSaved={onSaved} />
      )}
    </Modal>
  );
}

function FollowUpForm({ options, intervention, isReopen, onClose, onSaved }) {
  const qc = useQueryClient();
  const mutation = useAddFollowup();
  const schema = useMemo(() => makeSchema(), []);

  const statusOptions = intervention.next_statuses ?? [];
  const defaultTo = statusOptions.find((s) => s.value === intervention.status)?.value ?? statusOptions[0]?.value ?? '';

  const { register, handleSubmit, setError, watch, formState: { errors } } = useForm({
    resolver: zodResolver(schema),
    defaultValues: {
      kind: 'followup',
      followup_date: todayLocal(),
      to_status: defaultTo,
      progress: '',
      notes: '',
      next_follow_up_date: '',
      outcome: '',
    },
  });

  const kind = watch('kind');
  const toStatus = watch('to_status');
  const isFollowup = kind === 'followup';
  const showNext = kind === 'reschedule' || toStatus !== 'completed';
  const reasonRequired = isFollowup && (toStatus === 'requires_follow_up' || isReopen);

  const onSubmit = (v) => {
    const notes = v.notes?.trim() ? v.notes.trim() : null;
    const payload = {
      id: intervention.id,
      followup_date: v.followup_date,
      expected_status: intervention.status, // a mismatch means another tab changed it
    };

    if (v.kind === 'reschedule') {
      Object.assign(payload, { kind: 'reschedule', next_follow_up_date: v.next_follow_up_date, notes });
    } else {
      Object.assign(payload, {
        to_status: v.to_status,
        progress: v.progress?.trim() ? v.progress.trim() : null,
        notes,
      });
      if (v.to_status === 'completed') payload.outcome = v.outcome;
      else payload.next_follow_up_date = v.next_follow_up_date || null;
    }

    mutation.mutate(payload, {
      onSuccess: (result) => {
        onSaved?.(result);
        onClose();
      },
      onError: (err) => {
        applyServerErrors(err, setError, FIELDS);
        // Changed elsewhere: reload so the next attempt starts from the real status.
        if (err?.errors?.status) qc.invalidateQueries({ queryKey: ['intervention', String(intervention.id)] });
      },
    });
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      {isReopen && (
        <p className="rounded-md bg-amber-50 p-3 text-xs text-amber-800">
          This intervention is completed. Reopening moves it back to In Progress, clears the recorded outcome
          from the intervention, and keeps the earlier history. A reason is required.
        </p>
      )}

      {!isReopen && (
        <div className="flex gap-4 text-sm">
          <label className="flex items-center gap-2">
            <input type="radio" value="followup" {...register('kind')} /> Record a follow-up
          </label>
          <label className="flex items-center gap-2">
            <input type="radio" value="reschedule" {...register('kind')} /> Only change the follow-up date
          </label>
        </div>
      )}

      <FormField
        label={isFollowup ? 'Date of this follow-up' : 'Date of this change'}
        error={errors.followup_date?.message}
        hint="Not in the future and not before the intervention date."
      >
        <input
          type="date"
          className={inputCls}
          min={intervention.intervention_date}
          max={todayLocal()}
          {...register('followup_date')}
        />
      </FormField>

      {isFollowup && (
        <FormField label={isReopen ? 'Reopen as' : 'New status'} error={errors.to_status?.message}>
          <select className={inputCls} {...register('to_status')}>
            {statusOptions.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
          </select>
        </FormField>
      )}

      {isFollowup && (
        <FormField label="What happened (progress)" error={errors.progress?.message}>
          <textarea rows={3} className={inputCls} {...register('progress')} />
        </FormField>
      )}

      <FormField
        label={reasonRequired ? (isReopen ? 'Reason for reopening' : 'Reason') : 'Notes (optional)'}
        error={errors.notes?.message}
      >
        <textarea rows={2} className={inputCls} {...register('notes')} />
      </FormField>

      {isFollowup && toStatus === 'completed' && (
        <FormField label="Outcome" error={errors.outcome?.message}>
          <select className={inputCls} {...register('outcome')}>
            <option value="">Choose...</option>
            {options.outcomes.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </FormField>
      )}

      {showNext && (
        <FormField
          label={kind === 'reschedule' ? 'New follow-up date' : 'Next follow-up date'}
          error={errors.next_follow_up_date?.message}
          hint={toStatus === 'requires_follow_up' ? 'Required for Requires Follow-up.' : 'Optional. Leave empty if no further follow-up is planned.'}
        >
          <input type="date" className={inputCls} {...register('next_follow_up_date')} />
        </FormField>
      )}

      {errors.root && <p className="text-sm text-red-600">{errors.root.message}</p>}

      <div className="flex justify-end gap-2 pt-2">
        <button type="button" onClick={onClose} className="rounded-md border px-4 py-2 text-sm">Cancel</button>
        <button
          type="submit"
          disabled={mutation.isPending}
          className="rounded-md bg-blue-600 px-4 py-2 text-sm text-white disabled:opacity-50"
        >
          {mutation.isPending ? 'Saving...' : 'Save'}
        </button>
      </div>
    </form>
  );
}
