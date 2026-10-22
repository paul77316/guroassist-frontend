import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import FormField, { inputCls } from '../../components/ui/FormField';
import Modal from '../../components/ui/Modal';
import { useResetTeacherPassword } from '../../hooks/useAdmin';
import { applyServerErrors } from '../../utils/formErrors';

const schema = z.object({
  password: z.string().min(8, 'Use at least 8 characters'),
  password_confirmation: z.string().min(1, 'Confirm the new password'),
}).refine((values) => values.password === values.password_confirmation, {
  path: ['password_confirmation'],
  message: 'Passwords do not match',
});

export default function TeacherPasswordResetModal({ teacher, onClose, onReset }) {
  const resetPassword = useResetTeacherPassword();
  const { register, handleSubmit, setError, formState: { errors } } = useForm({
    resolver: zodResolver(schema),
    defaultValues: { password: '', password_confirmation: '' },
  });

  const onSubmit = (values) => {
    resetPassword.mutate({ id: teacher.id, ...values }, {
      onSuccess: (result) => {
        onReset?.(result);
        onClose();
      },
      onError: (error) => applyServerErrors(error, setError, ['password', 'password_confirmation']),
    });
  };

  return (
    <Modal title="Reset Teacher Password" onClose={onClose}>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <p className="rounded-md bg-gray-50 p-3 text-sm text-gray-600">
          Set a new password for <strong>{teacher.name}</strong>. Share it securely with the teacher.
        </p>
        <FormField label="New password" hint="At least 8 characters." error={errors.password?.message}>
          <input type="password" autoComplete="new-password" className={inputCls} {...register('password')} />
        </FormField>
        <FormField label="Confirm new password" error={errors.password_confirmation?.message}>
          <input type="password" autoComplete="new-password" className={inputCls} {...register('password_confirmation')} />
        </FormField>
        {errors.root && <p className="text-sm text-red-600">{errors.root.message}</p>}
        <div className="flex justify-end gap-2 pt-2">
          <button type="button" onClick={onClose} className="rounded-md border px-4 py-2 text-sm">
            Cancel
          </button>
          <button type="submit" disabled={resetPassword.isPending}
            className="rounded-md bg-blue-600 px-4 py-2 text-sm text-white disabled:opacity-50">
            {resetPassword.isPending ? 'Resetting…' : 'Reset Password'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
