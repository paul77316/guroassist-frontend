import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import Modal from '../../components/ui/Modal';
import FormField, { inputCls } from '../../components/ui/FormField';
import { useAcademicYears } from '../../hooks/useLookups';
import { useCreateTerm, useUpdateTerm } from '../../hooks/useAdmin';
import { applyServerErrors } from '../../utils/formErrors';

const FIELDS = ['academic_year_id', 'name', 'sort_order', 'start_date', 'end_date', 'status'];

const base = {
  name: z.string().trim().min(1, 'Name is required').max(100),
  sort_order: z.coerce.number({ invalid_type_error: 'Required' }).int().min(1, 'Min 1').max(20),
  start_date: z.string().min(1, 'Required'),
  end_date: z.string().min(1, 'Required'),
  status: z.enum(['upcoming', 'active', 'completed']),
};
const afterStart = (v) => v.end_date > v.start_date;
const afterMsg = { path: ['end_date'], message: 'Must be after the start date' };

const createSchema = z
  .object({ academic_year_id: z.coerce.number().min(1, 'Required'), ...base })
  .refine(afterStart, afterMsg);
const editSchema = z.object(base).refine(afterStart, afterMsg);

export default function TermFormModal({ term, onClose }) {
  const isEdit = !!term;
  const { data: years = [] } = useAcademicYears();
  const create = useCreateTerm();
  const update = useUpdateTerm();
  const mutation = isEdit ? update : create;

  const { register, handleSubmit, setError, formState: { errors } } = useForm({
    resolver: zodResolver(isEdit ? editSchema : createSchema),
    defaultValues: isEdit
      ? { name: term.name, sort_order: term.sort_order, start_date: term.start_date, end_date: term.end_date, status: term.status }
      : { academic_year_id: '', name: '', sort_order: '', start_date: '', end_date: '', status: 'upcoming' },
  });

  const onSubmit = (values) => {
    mutation.mutate(isEdit ? { id: term.id, ...values } : values, {
      onSuccess: onClose,
      onError: (err) => applyServerErrors(err, setError, FIELDS),
    });
  };

  return (
    <Modal title={isEdit ? 'Edit Term' : 'Add Term'} onClose={onClose}>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        {!isEdit && (
          <FormField label="Academic year" error={errors.academic_year_id?.message}>
            <select className={inputCls} {...register('academic_year_id')}>
              <option value="">Select academic year</option>
              {years.map((y) => <option key={y.id} value={y.id}>{y.name}</option>)}
            </select>
          </FormField>
        )}
        <FormField label="Name" error={errors.name?.message}>
          <input className={inputCls} placeholder="e.g. Term 1" {...register('name')} />
        </FormField>
        <FormField label="Order" error={errors.sort_order?.message} hint="1 = first term of the year">
          <input type="number" className={inputCls} {...register('sort_order')} />
        </FormField>
        <div className="grid grid-cols-2 gap-3">
          <FormField label="Start date" error={errors.start_date?.message}>
            <input type="date" className={inputCls} {...register('start_date')} />
          </FormField>
          <FormField label="End date" error={errors.end_date?.message}>
            <input type="date" className={inputCls} {...register('end_date')} />
          </FormField>
        </div>
        <FormField label="Status" error={errors.status?.message}>
          <select className={inputCls} {...register('status')}>
            <option value="upcoming">Upcoming</option>
            <option value="active">Active</option>
            <option value="completed">Completed</option>
          </select>
        </FormField>

        {errors.root && <p className="text-sm text-red-600">{errors.root.message}</p>}

        <div className="flex justify-end gap-2 pt-2">
          <button type="button" onClick={onClose} className="rounded-md border px-4 py-2 text-sm">Cancel</button>
          <button type="submit" disabled={mutation.isPending}
            className="rounded-md bg-blue-600 px-4 py-2 text-sm text-white disabled:opacity-50">
            {mutation.isPending ? 'Saving…' : 'Save'}
          </button>
        </div>
      </form>
    </Modal>
  );
}