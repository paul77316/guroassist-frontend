import { useForm, useFieldArray, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import Modal from '../../components/ui/Modal';
import Badge from '../../components/ui/Badge';
import FormField, { inputCls } from '../../components/ui/FormField';
import { useGradeLevels, useSubjects, useAcademicYears } from '../../hooks/useLookups';
import { useAdminTerms, useCreateConfig, useUpdateConfig } from '../../hooks/useAdmin';
import { applyServerErrors } from '../../utils/formErrors';

const TYPES = [
  ['written', 'Written'],
  ['performance_task', 'Performance task'],
  ['summative', 'Summative'],
  ['term_exam', 'Term exam'],
];
const FIELDS = ['name', 'status', 'academic_year_id', 'grade_level_id', 'subject_id', 'term_id',
  'passing_grade', 'category_average_method', 'rounding_decimals', 'components'];

const id = z.coerce.number({ invalid_type_error: 'Required' }).min(1, 'Required');

const schema = z.object({
  name: z.string().trim().min(1, 'Name is required').max(255),
  status: z.enum(['draft', 'active', 'archived']),
  academic_year_id: id,
  grade_level_id: id,
  subject_id: id,
  term_id: z.union([z.string(), z.number()]).nullable().optional(),
  passing_grade: z.coerce.number({ invalid_type_error: 'Required' }).min(0).max(100),
  category_average_method: z.enum(['total_points', 'mean_of_percentages']),
  rounding_decimals: z.coerce.number().int().min(0).max(4),
  components: z.array(z.object({
    name: z.string().trim().min(1, 'Required').max(100),
    type: z.string().min(1),
    weight: z.coerce.number({ invalid_type_error: 'Required' }).gt(0, '> 0').max(100),
  })).min(1, 'Add at least one category').max(10),
});
const lockedSchema = z.object({ name: schema.shape.name });

const blank = {
  name: '', status: 'draft', academic_year_id: '', grade_level_id: '', subject_id: '', term_id: '',
  passing_grade: 75, category_average_method: 'total_points', rounding_decimals: 2,
  components: [
    { name: 'Written Assessments', type: 'written', weight: '' },
    { name: 'Performance Tasks', type: 'performance_task', weight: '' },
    { name: 'Summative Assessments', type: 'summative', weight: '' },
    { name: 'Term Examination', type: 'term_exam', weight: '' },
  ],
};

const fromConfig = (c) => ({
  name: c.name, status: c.status, academic_year_id: c.academic_year_id,
  grade_level_id: c.grade_level_id, subject_id: c.subject_id, term_id: c.term_id ?? '',
  passing_grade: c.passing_grade, category_average_method: c.category_average_method,
  rounding_decimals: c.rounding_decimals,
  components: c.components.map(({ name, type, weight }) => ({ name, type, weight })),
});

const toPayload = (v) => ({
  ...v,
  term_id: v.term_id === '' || v.term_id == null ? null : Number(v.term_id),
});

export default function GradingConfigFormModal({ config, onClose }) {
  const isEdit = !!config;
  const locked = !!config?.is_locked;

  const { data: years = [] } = useAcademicYears();
  const { data: grades = [] } = useGradeLevels();
  const { data: subjects = [] } = useSubjects();
  const { data: terms = [] } = useAdminTerms();
  const create = useCreateConfig();
  const update = useUpdateConfig();
  const mutation = isEdit ? update : create;

  const { register, control, handleSubmit, setError, formState: { errors } } = useForm({
    resolver: zodResolver(locked ? lockedSchema : schema),
    defaultValues: config ? fromConfig(config) : blank,
  });
  const { fields, append, remove } = useFieldArray({ control, name: 'components' });
  const rows = useWatch({ control, name: 'components' }) ?? [];
  const yearId = useWatch({ control, name: 'academic_year_id' });

  const total = Math.round(rows.reduce((s, c) => s + (parseFloat(c?.weight) || 0), 0) * 100) / 100;
  const totalOk = Math.abs(total - 100) < 0.001;
  const yearTerms = terms.filter((t) => String(t.academic_year_id) === String(yearId));

  const onSubmit = (values) => {
    // Locked configs: send the stored values with only the name changed (the API rejects anything else).
    const payload = locked ? { ...toPayload(fromConfig(config)), name: values.name } : toPayload(values);
    mutation.mutate(isEdit ? { id: config.id, ...payload } : payload, {
      onSuccess: onClose,
      onError: (err) => applyServerErrors(err, setError, FIELDS),
    });
  };

  const nameOf = (list, id) => list.find((x) => x.id === id)?.name ?? `#${id}`;

  return (
    <Modal title={isEdit ? 'Edit Grading Configuration' : 'New Grading Configuration'}
      onClose={onClose} maxWidth="max-w-2xl">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        {locked && (
          <div className="rounded-md bg-amber-50 p-3 text-sm text-amber-800">
            <Badge kind="locked">Locked</Badge>{' '}
            Assessments already use this configuration, so only its name can be changed.
            To change the rules, close this and use <strong>Duplicate</strong>.
          </div>
        )}

        <FormField label="Name" error={errors.name?.message}>
          <input className={inputCls} placeholder="e.g. Mathematics 7 – Term 1" {...register('name')} />
        </FormField>

        {locked ? (
          <div className="rounded-md bg-gray-50 p-3 text-sm text-gray-700">
            <p>
              {nameOf(grades, config.grade_level_id)} · {nameOf(subjects, config.subject_id)} ·{' '}
              {nameOf(years, config.academic_year_id)} ·{' '}
              {config.term_id ? nameOf(terms, config.term_id) : 'All terms'}
            </p>
            <p className="mt-1">Passing grade {config.passing_grade} · {config.category_average_method === 'total_points' ? 'Total points' : 'Mean of percentages'}</p>
            <ul className="mt-2 space-y-0.5">
              {config.components.map((c) => <li key={c.id}>{c.name}: {c.weight}%</li>)}
            </ul>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <FormField label="Academic year" error={errors.academic_year_id?.message}>
                <select className={inputCls} {...register('academic_year_id')}>
                  <option value="">Select academic year</option>
                  {years.map((y) => <option key={y.id} value={y.id}>{y.name}</option>)}
                </select>
              </FormField>
              <FormField label="Grade level" error={errors.grade_level_id?.message}>
                <select className={inputCls} {...register('grade_level_id')}>
                  <option value="">Select grade level</option>
                  {grades.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}
                </select>
              </FormField>
              <FormField label="Subject" error={errors.subject_id?.message}>
                <select className={inputCls} {...register('subject_id')}>
                  <option value="">Select subject</option>
                  {subjects.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </FormField>
              <FormField label="Term" error={errors.term_id?.message}
                hint="A term-specific configuration overrides an “all terms” one.">
                <select className={inputCls} {...register('term_id')}>
                  <option value="">All terms</option>
                  {yearTerms.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
                </select>
              </FormField>
              <FormField label="Status" error={errors.status?.message}
                hint="Activating requires weights to total 100.">
                <select className={inputCls} {...register('status')}>
                  <option value="draft">Draft</option>
                  <option value="active">Active</option>
                  {isEdit && <option value="archived">Archived</option>}
                </select>
              </FormField>
              <FormField label="Passing grade" error={errors.passing_grade?.message}>
                <input type="number" step="0.01" className={inputCls} {...register('passing_grade')} />
              </FormField>
              <FormField label="Category average" error={errors.category_average_method?.message}>
                <select className={inputCls} {...register('category_average_method')}>
                  <option value="total_points">Total points</option>
                  <option value="mean_of_percentages">Mean of percentages</option>
                </select>
              </FormField>
              <FormField label="Decimal places" error={errors.rounding_decimals?.message}>
                <input type="number" className={inputCls} {...register('rounding_decimals')} />
              </FormField>
            </div>

            <div>
              <div className="mb-2 flex items-center justify-between">
                <h4 className="text-sm font-medium text-gray-700">Categories and weights</h4>
                <span className={`text-sm font-medium ${totalOk ? 'text-green-600' : 'text-amber-600'}`}>
                  Total: {total} / 100
                </span>
              </div>

              <div className="space-y-2">
                {fields.map((f, i) => (
                  <div key={f.id} className="grid grid-cols-[1fr_9rem_5rem_auto] items-start gap-2">
                    <div>
                      <input className={inputCls} placeholder="Category name" {...register(`components.${i}.name`)} />
                      {errors.components?.[i]?.name && (
                        <p className="mt-1 text-xs text-red-600">{errors.components[i].name.message}</p>
                      )}
                    </div>
                    <select className={inputCls} {...register(`components.${i}.type`)}>
                      {TYPES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                    </select>
                    <div>
                      <input type="number" step="0.01" placeholder="%" className={inputCls}
                        {...register(`components.${i}.weight`)} />
                      {errors.components?.[i]?.weight && (
                        <p className="mt-1 text-xs text-red-600">{errors.components[i].weight.message}</p>
                      )}
                    </div>
                    <button type="button" onClick={() => remove(i)} disabled={fields.length === 1}
                      className="px-2 py-2 text-gray-400 hover:text-red-600 disabled:opacity-30" aria-label="Remove category">
                      ✕
                    </button>
                  </div>
                ))}
              </div>

              {(errors.components?.message || errors.components?.root?.message) && (
                <p className="mt-2 text-sm text-red-600">
                  {errors.components.message ?? errors.components.root.message}
                </p>
              )}
              {fields.length < 10 && (
                <button type="button" onClick={() => append({ name: '', type: 'written', weight: '' })}
                  className="mt-2 text-sm text-blue-600 hover:underline">
                  + Add category
                </button>
              )}
            </div>
          </>
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