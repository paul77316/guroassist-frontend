import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import Modal from '../../components/ui/Modal';
import FormField, { inputCls } from '../../components/ui/FormField';
import SetupFormModal from '../admin/SetupFormModal';
import { SETUP } from '../admin/setupConfigs';
import { useGradeLevels, useSubjects, useAcademicYears } from '../../hooks/useLookups';
import { useCreateClass, useUpdateClass } from '../../hooks/useClasses';
import { useAuth } from '../../hooks/useAuth';
import { applyServerErrors } from '../../utils/formErrors';

const id = z.coerce.number({ invalid_type_error: 'Required' }).min(1, 'Required');

const createSchema = z.object({
  grade_level_id: id,
  section_name: z.string().trim().min(1, 'Section name is required').max(50),
  subject_id: id,
  academic_year_id: id,
});
const editSchema = z.object({ subject_id: id });

const FIELDS = ['grade_level_id', 'section_name', 'subject_id', 'academic_year_id'];

const Empty = ({ show, children }) =>
  show ? <p className="mt-1 text-xs text-amber-600">{children}</p> : null;

export default function ClassFormModal({ open, onClose, classItem }) {
  const isEdit = !!classItem;
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';
  const { data: grades = [], isLoading: gl, isError: gradesFailed, error: gradesError } = useGradeLevels();
  const { data: subjects = [], isLoading: sl, isError: subjectsFailed, error: subjectsError } = useSubjects();
  const { data: years = [], isLoading: yl, isError: yearsFailed, error: yearsError } = useAcademicYears();
  const create = useCreateClass();
  const update = useUpdateClass();
  const mutation = isEdit ? update : create;

  const [adding, setAdding] = useState(null);       // { path, field } while the quick-add form is open
  const [justAdded, setJustAdded] = useState(null); // { field, id } waiting for the refreshed list

  const { register, handleSubmit, reset, setValue, getValues, setError, formState: { errors } } = useForm({
    resolver: zodResolver(isEdit ? editSchema : createSchema),
  });

  useEffect(() => {
    if (!open) return;
    reset(
      isEdit
        ? { subject_id: classItem.subject_id }
        : { grade_level_id: '', section_name: '', subject_id: '', academic_year_id: '' }
    );
  }, [open, classItem, isEdit, reset]);

  // Pre-select the active academic year once the list loads (only if nothing is chosen yet)
  useEffect(() => {
    if (!open || isEdit || years.length === 0) return;
    if (getValues('academic_year_id')) return;
    const active = years.find((y) => y.is_active);
    if (active) setValue('academic_year_id', String(active.id));
  }, [open, isEdit, years, getValues, setValue]);

  // Select a newly added item once it shows up in the refreshed dropdown
  useEffect(() => {
    if (!justAdded) return;
    const list = { grade_level_id: grades, subject_id: subjects, academic_year_id: years }[justAdded.field];
    if (list.some((x) => x.id === justAdded.id)) {
      setValue(justAdded.field, String(justAdded.id));
      setJustAdded(null);
    }
  }, [justAdded, grades, subjects, years, setValue]);

  const onSubmit = (values) => {
    const payload = isEdit ? { id: classItem.id, ...values } : values;
    mutation.mutate(payload, {
      onSuccess: onClose,
      onError: (err) => applyServerErrors(err, setError, FIELDS),
    });
  };

  const addLink = (path, field) =>
    isAdmin ? (
      <button type="button" onClick={() => setAdding({ path, field })}
        className="mt-1 text-xs text-blue-600 hover:underline">
        + Add new {SETUP[path].singular}
      </button>
    ) : null;

  return (
    <>
      <Modal title={isEdit ? 'Edit Class' : 'Add Class'} onClose={onClose}>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {isEdit ? (
            <p className="rounded-md bg-gray-50 p-3 text-sm text-gray-600">
              {classItem.grade_level} – {classItem.section} ({classItem.academic_year}). The section and
              academic year can't be changed because the class roster and attendance are tied to them.
            </p>
          ) : (
            <>
              <FormField label="Grade level" error={errors.grade_level_id?.message}>
                <select className={inputCls} {...register('grade_level_id')}>
                  <option value="">Select grade level</option>
                  {grades.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}
                </select>
                <Empty show={gradesFailed}>Could not load grade levels: {gradesError?.message ?? 'Please try again.'}</Empty>
                <Empty show={!gl && !gradesFailed && grades.length === 0 && !isAdmin}>No grade levels yet. Ask an admin to add them.</Empty>
                {addLink('grade-levels', 'grade_level_id')}
              </FormField>

              <FormField label="Section name" error={errors.section_name?.message}>
                <input className={inputCls} placeholder="e.g. Rizal" {...register('section_name')} />
              </FormField>
            </>
          )}

          <FormField label="Subject" error={errors.subject_id?.message}>
            <select className={inputCls} {...register('subject_id')}>
              <option value="">Select subject</option>
              {subjects.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
            <Empty show={subjectsFailed}>Could not load subjects: {subjectsError?.message ?? 'Please try again.'}</Empty>
            <Empty show={!sl && !subjectsFailed && subjects.length === 0 && !isAdmin}>No subjects yet. Ask an admin to add them.</Empty>
            {!isEdit && addLink('subjects', 'subject_id')}
          </FormField>

          {!isEdit && (
            <FormField label="Academic year" error={errors.academic_year_id?.message}>
              <select className={inputCls} {...register('academic_year_id')}>
                <option value="">Select academic year</option>
                {years.map((y) => <option key={y.id} value={y.id}>{y.name}</option>)}
              </select>
              <Empty show={yearsFailed}>Could not load academic years: {yearsError?.message ?? 'Please try again.'}</Empty>
              <Empty show={!yl && !yearsFailed && years.length === 0 && !isAdmin}>No academic years yet. Ask an admin to add one.</Empty>
              {addLink('academic-years', 'academic_year_id')}
            </FormField>
          )}

          {errors.root && <p className="text-sm text-red-600">{errors.root.message}</p>}

          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={onClose} className="rounded-md border px-4 py-2 text-sm">
              Cancel
            </button>
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

      {adding && (
        <SetupFormModal
          path={adding.path}
          onClose={() => setAdding(null)}
          onSaved={(item) => setJustAdded({ field: adding.field, id: item.id })}
        />
      )}
    </>
  );
}
