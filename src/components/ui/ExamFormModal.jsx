import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import Modal from './Modal';
import FormField, { inputCls } from './FormField';
import { useClasses } from '../../hooks/useClasses';
import { useCreateExam, useUpdateExam, useExamOptions } from '../../hooks/useExams';
import { applyServerErrors } from '../../utils/formErrors';
import { todayLocal } from '../../utils/dates';

const schema = z.object({
  class_assignment_id: z.string().optional(),
  title: z.string().trim().min(1, 'Give the exam a title').max(160, 'Keep it under 160 characters'),
  exam_date: z.string().min(1, 'Required'),
  choice_count: z.string().min(1, 'Choose how many choices'),
});

const FIELDS = ['class_assignment_id', 'title', 'exam_date', 'choice_count'];
const LETTERS = ['A', 'B', 'C', 'D', 'E'];
const classText = (c) => `${c.grade_level} - ${c.section}${c.subject ? ` (${c.subject})` : ''}`;

/**
 * Create (no exam given) or edit (exam given) an exam. A new exam starts with Set A.
 * The class cannot change after creation, and the number of choices is fixed once the exam has questions.
 * onSaved(result) runs after a successful save.
 */
export default function ExamFormModal({ exam, onClose, onSaved }) {
  const isEdit = !!exam;
  const { data: classes = [] } = useClasses();
  const { data: options } = useExamOptions();
  const create = useCreateExam();
  const update = useUpdateExam();
  const mutation = isEdit ? update : create;

  const counts = options?.choice_counts ?? [4, 5];
  const locked = isEdit && (exam.question_count ?? 0) > 0;

  const { register, handleSubmit, setError, formState: { errors } } = useForm({
    resolver: zodResolver(schema),
    defaultValues: isEdit
      ? {
          class_assignment_id: '',
          title: exam.title,
          exam_date: exam.exam_date,
          choice_count: String(exam.choice_count),
        }
      : { class_assignment_id: '', title: '', exam_date: todayLocal(), choice_count: '4' },
  });

  const onSubmit = (v) => {
    if (!isEdit && !v.class_assignment_id) {
      setError('class_assignment_id', { message: 'Choose a class' });
      return;
    }

    const common = {
      title: v.title.trim(),
      exam_date: v.exam_date,
      choice_count: locked ? exam.choice_count : Number(v.choice_count),
    };

    mutation.mutate(
      isEdit ? { id: exam.id, ...common } : { class_assignment_id: Number(v.class_assignment_id), ...common },
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
    <Modal title={isEdit ? 'Edit exam' : 'New exam'} onClose={onClose} maxWidth="max-w-lg">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <p className="rounded-md bg-gray-50 p-3 text-xs text-gray-600">
          An exam is multiple choice. You write the questions here and print the paper later. This stays private to
          you and administrators, and nothing here is sent to anyone.
        </p>

        {!isEdit && (
          <FormField label="Class" error={errors.class_assignment_id?.message}>
            <select className={inputCls} {...register('class_assignment_id')}>
              <option value="">Choose...</option>
              {classes.map((c) => <option key={c.id} value={c.id}>{classText(c)}</option>)}
            </select>
          </FormField>
        )}

        <FormField label="Title" error={errors.title?.message}>
          <input type="text" className={inputCls} placeholder="e.g. Quarter 1 Quiz" {...register('title')} />
        </FormField>

        <div className="grid grid-cols-2 gap-3">
          <FormField label="Exam date" error={errors.exam_date?.message}>
            <input type="date" className={inputCls} {...register('exam_date')} />
          </FormField>

          {locked ? (
            <FormField label="Choices" hint="Fixed once the exam has questions.">
              <p className="rounded-md bg-gray-50 px-3 py-2 text-sm text-gray-700">
                {exam.choice_count} choices (A-{LETTERS[exam.choice_count - 1]})
              </p>
            </FormField>
          ) : (
            <FormField label="Choices per question" error={errors.choice_count?.message}>
              <select className={inputCls} {...register('choice_count')}>
                {counts.map((n) => <option key={n} value={n}>{n} choices (A-{LETTERS[n - 1]})</option>)}
              </select>
            </FormField>
          )}
        </div>

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