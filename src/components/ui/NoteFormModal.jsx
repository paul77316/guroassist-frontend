import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import Modal from './Modal';
import FormField, { inputCls } from './FormField';
import { useCreateNote, useUpdateNote } from '../../hooks/useStudentNotes';
import { applyServerErrors } from '../../utils/formErrors';

const schema = z.object({
  class_assignment_id: z.string().optional(),
  body: z.string().trim().min(1, 'Write the note').max(5000, 'Keep it under 5000 characters'),
});

const FIELDS = ['class_assignment_id', 'body'];

/**
 * Add (studentId given) or edit (note given) a private note.
 * classes: the student's classes ({ id, label, subject }); a note may also be general (no class).
 * The class cannot be changed after the note is created.
 */
export default function NoteFormModal({ studentId, classes = [], note, onClose, onSaved }) {
  const isEdit = !!note;
  const create = useCreateNote();
  const update = useUpdateNote();
  const mutation = isEdit ? update : create;

  const { register, handleSubmit, setError, formState: { errors } } = useForm({
    resolver: zodResolver(schema),
    defaultValues: { class_assignment_id: '', body: isEdit ? note.body ?? '' : '' },
  });

  const onSubmit = (v) => {
    const body = v.body.trim();
    mutation.mutate(
      isEdit
        ? { id: note.id, body }
        : { studentId, class_assignment_id: v.class_assignment_id ? Number(v.class_assignment_id) : null, body },
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
    <Modal title={isEdit ? 'Edit note' : 'Add note'} onClose={onClose} maxWidth="max-w-lg">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <p className="rounded-md bg-gray-50 p-3 text-xs text-gray-600">
          Write only what you need to remember. This stays private to you and administrators, and nothing
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

        <FormField label="Note" error={errors.body?.message}>
          <textarea rows={6} className={inputCls} {...register('body')} />
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
    </Modal>
  );
}
