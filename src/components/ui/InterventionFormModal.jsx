    import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import Modal from './Modal';
import FormField, { inputCls } from './FormField';
import {
  useCreateIntervention, useUpdateIntervention, useInterventionOptions,
} from '../../hooks/useInterventions';
import { applyServerErrors } from '../../utils/formErrors';
import { todayLocal } from '../../utils/dates';

const schema = z
  .object({
    class_assignment_id: z.string().optional(),
    concern_type: z.string().min(1, 'Choose a concern type'),
    concern: z.string().trim().min(1, 'Describe the concern').max(2000),
    intervention_type: z.string().min(1, 'Choose what you did or plan to do'),
    intervention_date: z.string().min(1, 'Required'),
    follow_up_date: z.string().optional(),
    notes: z.string().max(5000).optional(),
  })
  .refine((v) => !v.follow_up_date || v.follow_up_date >= v.intervention_date, {
    path: ['follow_up_date'],
    message: 'Must be on or after the intervention date',
  });

const FIELDS = ['class_assignment_id', 'concern_type', 'concern', 'intervention_type', 'intervention_date', 'follow_up_date', 'notes'];

/**
 * Record (studentId given) or edit (intervention given) an intervention.
 * classes: the student's classes ({ id, label, subject }); a record may also be general (no class).
 * initial: optional pre-fill for a new record (e.g. from a monitoring flag). Nothing is saved until the teacher submits.
 */
export default function InterventionFormModal({ studentId, classes = [], intervention, initial, onClose, onSaved }) {
  const isEdit = !!intervention;
  const { data: options, isError } = useInterventionOptions();

  return (
    <Modal title={isEdit ? 'Edit intervention' : 'Record intervention'} onClose={onClose} maxWidth="max-w-lg">
      {isError ? (
        <p className="py-6 text-center text-sm text-red-600">Could not load the form options.</p>
      ) : !options ? (
        <p className="py-6 text-center text-sm text-gray-500">Loading...</p>
      ) : (
        <InterventionForm
          options={options}
          studentId={studentId}
          classes={classes}
          intervention={intervention}
          initial={initial}
          onClose={onClose}
          onSaved={onSaved}
        />
      )}
    </Modal>
  );
}

// Mounted only after the options exist, so the selects start with the right value.
function InterventionForm({ options, studentId, classes, intervention, initial, onClose, onSaved }) {
  const isEdit = !!intervention;
  const create = useCreateIntervention();
  const update = useUpdateIntervention();
  const mutation = isEdit ? update : create;

  const { register, handleSubmit, setError, formState: { errors } } = useForm({
    resolver: zodResolver(schema),
    defaultValues: isEdit
      ? {
          concern_type: intervention.concern_type,
          concern: intervention.concern ?? '',
          intervention_type: intervention.intervention_type,
          intervention_date: intervention.intervention_date,
          notes: intervention.notes ?? '',
        }
      : {
          class_assignment_id: initial?.class_assignment_id ? String(initial.class_assignment_id) : '',
          concern_type: initial?.concern_type ?? '',
          concern: initial?.concern ?? '',
          intervention_type: '',
          intervention_date: todayLocal(),
          follow_up_date: '',
          notes: '',
        },
  });

  const onSubmit = (v) => {
    const common = {
      concern_type: v.concern_type,
      concern: v.concern.trim(),
      intervention_type: v.intervention_type,
      intervention_date: v.intervention_date,
      notes: v.notes?.trim() ? v.notes.trim() : null,
    };

    mutation.mutate(
      isEdit
        ? { id: intervention.id, ...common }
        : {
            studentId,
            class_assignment_id: v.class_assignment_id ? Number(v.class_assignment_id) : null,
            follow_up_date: v.follow_up_date || null,
            ...common,
          },
      {
        onSuccess: (result) => {
          onSaved?.(result);
          onClose();
        },
        onError: (err) => applyServerErrors(err, setError, FIELDS),
      }
    );
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <p className="rounded-md bg-gray-50 p-3 text-xs text-gray-600">
        Record only what you need to follow up. This stays private to you and administrators, and nothing
        here is sent to anyone.
      </p>

      {!isEdit && (
        <FormField label="Class" error={errors.class_assignment_id?.message} hint="Leave as General if this is not about one class.">
          <select className={inputCls} {...register('class_assignment_id')}>
            <option value="">General (not tied to a class)</option>
            {classes.map((c) => (
              <option key={c.id} value={c.id}>{c.label} - {c.subject}</option>
            ))}
          </select>
        </FormField>
      )}

      <div className="grid grid-cols-2 gap-3">
        <FormField label="Concern type" error={errors.concern_type?.message}>
          <select className={inputCls} {...register('concern_type')}>
            <option value="">Choose...</option>
            {options.concern_types.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </FormField>
        <FormField label="Intervention" error={errors.intervention_type?.message}>
          <select className={inputCls} {...register('intervention_type')}>
            <option value="">Choose...</option>
            {options.intervention_types.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </FormField>
      </div>

      <FormField label="Concern" error={errors.concern?.message}>
        <textarea rows={3} className={inputCls} placeholder="e.g. Repeated missing assignments" {...register('concern')} />
      </FormField>

      <div className="grid grid-cols-2 gap-3">
        <FormField label="Date" error={errors.intervention_date?.message}>
          <input type="date" className={inputCls} {...register('intervention_date')} />
        </FormField>
        {!isEdit && (
          <FormField label="Follow-up date (optional)" error={errors.follow_up_date?.message}>
            <input type="date" className={inputCls} {...register('follow_up_date')} />
          </FormField>
        )}
      </div>

      <FormField label="Notes (optional)" error={errors.notes?.message}>
        <textarea rows={3} className={inputCls} {...register('notes')} />
      </FormField>

      {isEdit && (
        <p className="text-xs text-gray-500">
          To change the follow-up date or the status, record a follow-up from the intervention.
        </p>
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
