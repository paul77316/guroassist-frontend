import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import Modal from './Modal';
import FormField, { inputCls } from './FormField';
import { useInterventionOptions } from '../../hooks/useInterventions';
import { useCreateCommunication, useUpdateCommunication } from '../../hooks/useParentCommunications';
import { applyServerErrors } from '../../utils/formErrors';
import { todayLocal } from '../../utils/dates';

const schema = z
  .object({
    class_assignment_id: z.string().optional(),
    contact_date: z.string().min(1, 'Required'),
    method: z.string().min(1, 'Choose how you made contact'),
    reason: z.string().trim().min(1, 'Give a short reason').max(255, 'Keep it under 255 characters'),
    summary: z.string().trim().min(1, 'Summarize the contact').max(5000, 'Keep it under 5000 characters'),
    follow_up_date: z.string().optional(),
  })
  .refine((v) => !v.follow_up_date || v.follow_up_date >= v.contact_date, {
    path: ['follow_up_date'],
    message: 'Must be on or after the contact date',
  });

const FIELDS = ['class_assignment_id', 'contact_date', 'method', 'reason', 'summary', 'follow_up_date'];

/**
 * Log (studentId given) or edit (communication given) contact with a parent or guardian.
 * This records contact that already happened. Nothing is sent to anyone.
 * classes: the student's classes ({ id, label, subject }); a record may also be general (no class).
 * The class cannot be changed after the record is created.
 */
export default function CommunicationFormModal({ studentId, classes = [], communication, onClose, onSaved }) {
  const isEdit = !!communication;
  const { data: options, isError, isFetching, refetch } = useInterventionOptions();
  const missingMethods = !!options && !Array.isArray(options.methods);
  const [retried, setRetried] = useState(false);

  // The options query never expires, so an old cached answer can lack the methods. Refetch once.
  useEffect(() => {
    if (missingMethods && !retried) {
      setRetried(true);
      refetch();
    }
  }, [missingMethods, retried, refetch]);

  const stillMissing = missingMethods && retried && !isFetching;
  const waiting = !options || (missingMethods && !stillMissing);

  return (
    <Modal title={isEdit ? 'Edit communication' : 'Log communication'} onClose={onClose} maxWidth="max-w-lg">
      {isError || missingMethods ? (
        <p className="py-6 text-center text-sm text-red-600">
          Could not load the form options. Reload the page and try again.
        </p>
      ) : !options ? (
        <p className="py-6 text-center text-sm text-gray-500">Loading...</p>
      ) : (
        <CommunicationForm
          methods={options.methods}
          studentId={studentId}
          classes={classes}
          communication={communication}
          onClose={onClose}
          onSaved={onSaved}
        />
      )}
    </Modal>
  );
}

// Mounted only after the options exist, so the method select starts with the right value.
function CommunicationForm({ methods, studentId, classes, communication, onClose, onSaved }) {
  const isEdit = !!communication;
  const create = useCreateCommunication();
  const update = useUpdateCommunication();
  const mutation = isEdit ? update : create;

  const { register, handleSubmit, setError, formState: { errors } } = useForm({
    resolver: zodResolver(schema),
    defaultValues: isEdit
      ? {
          class_assignment_id: '',
          contact_date: communication.contact_date,
          method: communication.method,
          reason: communication.reason ?? '',
          summary: communication.summary ?? '',
          follow_up_date: communication.follow_up_date ?? '',
        }
      : {
          class_assignment_id: '',
          contact_date: todayLocal(),
          method: '',
          reason: '',
          summary: '',
          follow_up_date: '',
        },
  });

  const onSubmit = (v) => {
    const common = {
      contact_date: v.contact_date,
      method: v.method,
      reason: v.reason.trim(),
      summary: v.summary.trim(),
      follow_up_date: v.follow_up_date || null,
    };

    mutation.mutate(
      isEdit
        ? { id: communication.id, ...common }
        : {
            studentId,
            class_assignment_id: v.class_assignment_id ? Number(v.class_assignment_id) : null,
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
        This logs contact that already happened. Nothing here is sent to the parent or guardian. The record
        stays private to you and administrators.
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
        <FormField label="Contact date" error={errors.contact_date?.message}>
          <input type="date" max={todayLocal()} className={inputCls} {...register('contact_date')} />
        </FormField>
        <FormField label="Method" error={errors.method?.message}>
          <select className={inputCls} {...register('method')}>
            <option value="">Choose...</option>
            {methods.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </FormField>
      </div>

      <FormField label="Reason" error={errors.reason?.message}>
        <input type="text" className={inputCls} placeholder="e.g. Missing work this month" {...register('reason')} />
      </FormField>

      <FormField label="Summary" error={errors.summary?.message}>
        <textarea rows={4} className={inputCls} placeholder="What was discussed or agreed" {...register('summary')} />
      </FormField>

      <FormField label="Follow-up date (optional)" error={errors.follow_up_date?.message}>
        <input type="date" className={inputCls} {...register('follow_up_date')} />
      </FormField>

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
