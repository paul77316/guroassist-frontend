import { useForm } from 'react-hook-form';
import Modal from '../../components/ui/Modal';
import FormField, { inputCls } from '../../components/ui/FormField';
import { useCreateSetup, useUpdateSetup } from '../../hooks/useAdmin';
import { applyServerErrors } from '../../utils/formErrors';
import { SETUP } from './setupConfigs';

export default function SetupFormModal({ path, item, onClose, onSaved }) {
  const cfg = SETUP[path];
  const isEdit = !!item;
  const create = useCreateSetup(path);
  const update = useUpdateSetup(path);
  const mutation = isEdit ? update : create;
  const names = cfg.fields.map((f) => f.name);

  const { register, handleSubmit, setError, formState: { errors } } = useForm({
    defaultValues: Object.fromEntries(
      cfg.fields.map((f) => [
        f.name,
        f.type === 'checkbox' ? (isEdit ? !!item[f.name] : false) : (isEdit ? item[f.name] ?? '' : ''),
      ])
    ),
  });

  const onSubmit = (values) => {
    mutation.mutate(isEdit ? { id: item.id, ...values } : values, {
      onSuccess: (saved) => { onSaved?.(saved); onClose(); },
      onError: (err) => applyServerErrors(err, setError, names),
    });
  };

  return (
    <Modal title={`${isEdit ? 'Edit' : 'Add'} ${cfg.singular}`} onClose={onClose}>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        {cfg.fields.map((f) =>
          f.type === 'checkbox' ? (
            <div key={f.name}>
              <label className="flex items-center gap-2 text-sm text-gray-700">
                <input type="checkbox" {...register(f.name)} />
                {f.label}
              </label>
              {f.hint && <p className="mt-1 text-xs text-gray-500">{f.hint}</p>}
              {errors[f.name] && <p className="mt-1 text-xs text-red-600">{errors[f.name].message}</p>}
            </div>
          ) : (
            <FormField key={f.name} label={f.label} hint={f.hint} error={errors[f.name]?.message}>
              <input
                type={f.type ?? 'text'}
                placeholder={f.placeholder}
                className={inputCls}
                {...register(f.name, { required: f.required ? 'Required' : false })}
              />
            </FormField>
          )
        )}

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