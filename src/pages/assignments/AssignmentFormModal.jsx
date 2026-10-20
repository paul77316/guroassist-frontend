import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import Modal from '../../components/ui/Modal';
import FormField, { inputCls } from '../../components/ui/FormField';
import { useCreateAssignment, useUpdateAssignment } from '../../hooks/useAssignments';
import { applyServerErrors } from '../../utils/formErrors';
import { addDays, todayLocal } from '../../utils/dates';

const schema = z
  .object({
    title: z.string().trim().min(1, 'Title is required').max(255),
    description: z.string().max(5000).optional(),
    assigned_date: z.string().min(1, 'Required'),
    due_date: z.string().min(1, 'Required'),
  })
  .refine((v) => v.due_date >= v.assigned_date, {
    path: ['due_date'],
    message: 'Must be on or after the date assigned',
  });

const FIELDS = ['title', 'description', 'assigned_date', 'due_date'];

/** Add (classId given) or edit (assignment given) an assignment. onSaved receives the API result. */
export default function AssignmentFormModal({ classId, assignment, onClose, onSaved }) {
  const isEdit = !!assignment;
  const create = useCreateAssignment();
  const update = useUpdateAssignment();
  const mutation = isEdit ? update : create;

  const today = todayLocal();
  const { register, handleSubmit, setError, formState: { errors } } = useForm({
    resolver: zodResolver(schema),
    defaultValues: isEdit
      ? {
          title: assignment.title,
          description: assignment.description ?? '',
          assigned_date: assignment.assigned_date,
          due_date: assignment.due_date,
        }
      : { title: '', description: '', assigned_date: today, due_date: addDays(today, 7) },
  });

  const onSubmit = (v) => {
    const payload = {
      title: v.title,
      description: v.description?.trim() ? v.description.trim() : null,
      assigned_date: v.assigned_date,
      due_date: v.due_date,
    };
    mutation.mutate(isEdit ? { id: assignment.id, ...payload } : { class_assignment_id: Number(classId), ...payload }, {
      onSuccess: (result) => {
        onSaved?.(result);
        onClose();
      },
      onError: (err) => applyServerErrors(err, setError, FIELDS),
    });
  };

  return (
    <Modal title={isEdit ? 'Edit activity' : 'Add activity'} onClose={onClose}>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <FormField label="Title" error={errors.title?.message}>
          <input className={inputCls} placeholder="e.g. Activity 3: Fractions" {...register('title')} />
        </FormField>

        <FormField label="Description (optional)" error={errors.description?.message}>
          <textarea rows={3} className={inputCls} {...register('description')} />
        </FormField>

        <div className="grid grid-cols-2 gap-3">
          <FormField label="Date assigned" error={errors.assigned_date?.message}>
            <input type="date" className={inputCls} {...register('assigned_date')} />
          </FormField>
          <FormField label="Due date" error={errors.due_date?.message}>
            <input type="date" className={inputCls} {...register('due_date')} />
          </FormField>
        </div>

        {isEdit && (
          <p className="rounded-md bg-gray-50 p-3 text-xs text-gray-600">
            Changing the due date re-checks the hand-in dates already recorded: work handed in after the
            new due date becomes late, and work on or before it becomes on time. Missing and not-yet-submitted
            follow the new date automatically.
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
            {mutation.isPending ? 'Saving…' : 'Save'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
