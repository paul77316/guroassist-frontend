import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useNavigate } from 'react-router-dom';
import FormField, { inputCls } from '../../components/ui/FormField';
import { useAuth } from '../../hooks/useAuth';
import { applyServerErrors } from '../../utils/formErrors';

const schema = z.object({
  current_password: z.string().min(1, 'Enter your initial password'),
  password: z.string().min(8, 'Use at least 8 characters'),
  password_confirmation: z.string().min(1, 'Confirm your new password'),
}).refine((values) => values.password === values.password_confirmation, {
  path: ['password_confirmation'],
  message: 'Passwords do not match',
}).refine((values) => values.password !== values.current_password, {
  path: ['password'],
  message: 'Choose a password different from your initial password',
});

const fields = ['current_password', 'password', 'password_confirmation'];

export default function InitialPasswordPage() {
  const { user, changeInitialPassword, logout } = useAuth();
  const navigate = useNavigate();
  const [serverError, setServerError] = useState('');
  const { register, handleSubmit, setError, formState: { errors, isSubmitting } } = useForm({
    resolver: zodResolver(schema),
    defaultValues: { current_password: '', password: '', password_confirmation: '' },
  });

  const onSubmit = async (values) => {
    setServerError('');
    try {
      await changeInitialPassword(values);
      navigate('/dashboard', { replace: true });
    } catch (error) {
      if (error.code === 'initial_password_expired') {
        setServerError('Your initial password has expired. Contact your school administrator to reset it.');
      } else {
        applyServerErrors(error, setError, fields);
      }
    }
  };

  const handleLogout = async () => {
    await logout();
    navigate('/login', { replace: true });
  };

  const expiresAt = user?.initial_password_expires_at
    ? new Date(user.initial_password_expires_at).toLocaleString()
    : null;

  return (
    <div>
      <h2 className="mb-2 text-xl font-semibold text-gray-900">Change your initial password</h2>
      {user?.initial_password_expired ? (
        <div className="space-y-4">
          <p className="rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            Your initial password has expired. Contact your school administrator to reset it and send you a new sign-in password.
          </p>
          <button type="button" onClick={handleLogout} className="rounded-md border px-4 py-2 text-sm text-gray-700 hover:bg-gray-50">
            Log out
          </button>
        </div>
      ) : (
        <>
          <p className="mb-5 text-sm text-gray-600">
            Set a new password to activate your account. {expiresAt && `Your initial password expires ${expiresAt}.`}
          </p>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            {serverError && <p role="alert" className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{serverError}</p>}
            {errors.root && <p role="alert" className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{errors.root.message}</p>}
            <FormField label="Initial password" error={errors.current_password?.message}>
              <input type="password" autoComplete="current-password" className={inputCls} {...register('current_password')} />
            </FormField>
            <FormField label="New password" hint="Use at least 8 characters." error={errors.password?.message}>
              <input type="password" autoComplete="new-password" className={inputCls} {...register('password')} />
            </FormField>
            <FormField label="Confirm new password" error={errors.password_confirmation?.message}>
              <input type="password" autoComplete="new-password" className={inputCls} {...register('password_confirmation')} />
            </FormField>
            <div className="flex justify-end gap-2 pt-2">
              <button type="button" onClick={handleLogout} className="rounded-md border px-4 py-2 text-sm">
                Log out
              </button>
              <button type="submit" disabled={isSubmitting}
                className="rounded-md bg-blue-600 px-4 py-2 text-sm text-white disabled:opacity-50">
                {isSubmitting ? 'Updating…' : 'Update Password'}
              </button>
            </div>
          </form>
        </>
      )}
    </div>
  );
}
