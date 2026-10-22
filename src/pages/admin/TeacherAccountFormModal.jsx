import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import FormField, { inputCls } from '../../components/ui/FormField';
import Modal from '../../components/ui/Modal';
import { useCreateTeacherAccount, useUpdateTeacherAccount } from '../../hooks/useAdmin';
import { applyServerErrors } from '../../utils/formErrors';

const detailsSchema = z.object({
  name: z.string().trim().min(1, 'Name is required').max(255),
  email: z.string().trim().email('Enter a valid email').max(255),
  employee_id: z.string().trim().min(1, 'Employee ID is required').max(50),
  contact_number: z.string().trim().max(20, 'Use 20 characters or fewer'),
});

const createSchema = detailsSchema.extend({
  password: z.string().min(8, 'Use at least 8 characters'),
  password_confirmation: z.string().min(1, 'Confirm the temporary password'),
}).refine((values) => values.password === values.password_confirmation, {
  path: ['password_confirmation'],
  message: 'Passwords do not match',
});

const detailFields = ['name', 'email', 'employee_id', 'contact_number'];
const createFields = [...detailFields, 'password', 'password_confirmation'];

export default function TeacherAccountFormModal({ teacher, onClose, onCreated }) {
  const isEdit = !!teacher;
  const create = useCreateTeacherAccount();
  const update = useUpdateTeacherAccount();
  const mutation = isEdit ? update : create;
  const { register, handleSubmit, setError, formState: { errors } } = useForm({
    resolver: zodResolver(isEdit ? detailsSchema : createSchema),
    defaultValues: {
      name: teacher?.name ?? '',
      email: teacher?.email ?? '',
      employee_id: teacher?.employee_id ?? '',
      contact_number: teacher?.contact_number ?? '',
      password: '',
      password_confirmation: '',
    },
  });

  const onSubmit = (values) => {
    mutation.mutate(isEdit ? { id: teacher.id, ...values } : values, {
      onSuccess: (result) => {
        if (!isEdit) onCreated?.(result);
        onClose();
      },
      onError: (error) => applyServerErrors(error, setError, isEdit ? detailFields : createFields),
    });
  };

  return (
    <Modal title={isEdit ? 'Edit Teacher Details' : 'Add Teacher Account'} onClose={onClose} maxWidth="max-w-xl">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        {!isEdit && (
          <p className="rounded-md bg-gray-50 p-3 text-sm text-gray-600">
            Create the teacher's sign-in and profile. Share the temporary password with them securely.
          </p>
        )}

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <FormField label="Full name" error={errors.name?.message}>
            <input autoComplete="name" className={inputCls} {...register('name')} />
          </FormField>
          <FormField label="Email address" error={errors.email?.message}>
            <input type="email" autoComplete="email" className={inputCls} {...register('email')} />
          </FormField>
          <FormField label="Employee ID" error={errors.employee_id?.message}>
            <input className={inputCls} {...register('employee_id')} />
          </FormField>
          <FormField label="Contact number (optional)" error={errors.contact_number?.message}>
            <input type="tel" autoComplete="tel" className={inputCls} {...register('contact_number')} />
          </FormField>
          {!isEdit && (
            <>
              <FormField label="Temporary password" hint="At least 8 characters." error={errors.password?.message}>
                <input type="password" autoComplete="new-password" className={inputCls} {...register('password')} />
              </FormField>
              <FormField label="Confirm password" error={errors.password_confirmation?.message}>
                <input type="password" autoComplete="new-password" className={inputCls} {...register('password_confirmation')} />
              </FormField>
            </>
          )}
        </div>

        {errors.root && <p className="text-sm text-red-600">{errors.root.message}</p>}

        <div className="flex justify-end gap-2 pt-2">
          <button type="button" onClick={onClose} className="rounded-md border px-4 py-2 text-sm">
            Cancel
          </button>
          <button type="submit" disabled={mutation.isPending}
            className="rounded-md bg-blue-600 px-4 py-2 text-sm text-white disabled:opacity-50">
            {mutation.isPending ? (isEdit ? 'Saving…' : 'Creating…') : (isEdit ? 'Save Changes' : 'Create Account')}
          </button>
        </div>
      </form>
    </Modal>
  );
}
