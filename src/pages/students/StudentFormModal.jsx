import { useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import Modal from '../../components/ui/Modal';
import { useCreateStudent, useUpdateStudent } from '../../hooks/useStudents';
import { useClasses } from '../../hooks/useClasses';
import { useGradeLevels } from '../../hooks/useLookups';
import { useAuth } from '../../hooks/useAuth';

// Editing doesn't change a student's classes here; that's done from the class page (Add students / Remove).
const baseFields = {
  student_id: z.string().min(1, 'Student ID is required'),
  first_name: z.string().min(1, 'First name is required'),
  middle_name: z.string().optional(),
  last_name: z.string().min(1, 'Last name is required'),
  sex: z.enum(['male', 'female'], { errorMap: () => ({ message: 'Select sex' }) }),
  date_of_birth: z.string().min(1, 'Date of birth is required'),
  contact_number: z.string().optional(),
  guardian_name: z.string().optional(),
  guardian_contact: z.string().optional(),
  guardian_email: z.union([z.literal(''), z.string().trim().email('Enter a valid email')]).optional(),
};

const editSchema = z.object(baseFields);

const inputCls = 'mt-1 w-full rounded-md border border-gray-300 px-2 py-1.5 text-sm';

export default function StudentFormModal({ student, onClose }) {
  const isEditing = !!student;
  const { data: classes } = useClasses();
  const { data: gradeLevels } = useGradeLevels();
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';
  const createStudent = useCreateStudent();
  const updateStudent = useUpdateStudent();

  // Teachers must pick a class (a student in no class would be invisible to them); admins may skip it.
  const createSchema = useMemo(
    () =>
      z.object({
        ...baseFields,
        class_assignment_id: isAdmin ? z.string().optional() : z.string().min(1, 'Select a class'),
        grade_level_id: z.string().optional(),
      }),
    [isAdmin]
  );

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(isEditing ? editSchema : createSchema),
    defaultValues: isEditing
      ? {
          student_id: student.student_id,
          first_name: student.first_name,
          middle_name: student.middle_name ?? '',
          last_name: student.last_name,
          sex: student.sex,
          date_of_birth: student.date_of_birth,
          contact_number: student.contact_number ?? '',
          guardian_name: student.guardian_name ?? '',
          guardian_contact: student.guardian_contact ?? '',
          guardian_email: student.guardian_email ?? '',
        }
      : { sex: 'male' },
  });

  const classChosen = watch('class_assignment_id');

  const onSubmit = async (values) => {
    if (isEditing) {
      await updateStudent.mutateAsync({ id: student.id, payload: values });
    } else {
      await createStudent.mutateAsync({
        ...values,
        class_assignment_id: values.class_assignment_id ? Number(values.class_assignment_id) : undefined,
        // a chosen class sets the grade level, so this only applies to an admin adding a student with no class
        grade_level_id:
          isAdmin && !values.class_assignment_id && values.grade_level_id
            ? Number(values.grade_level_id)
            : undefined,
      });
    }
    onClose();
  };

  const mutationError = createStudent.error || updateStudent.error;
  const serverMessage =
    Object.values(mutationError?.errors ?? {}).flat()[0] ?? mutationError?.message;

  return (
    <Modal title={isEditing ? 'Edit Student' : 'Add Student'} onClose={onClose}>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-3">
        {mutationError && (
          <div className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{serverMessage}</div>
        )}

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-gray-700">Student ID</label>
            <input {...register('student_id')} className={inputCls} />
            {errors.student_id && <p className="mt-0.5 text-xs text-red-600">{errors.student_id.message}</p>}
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700">Sex</label>
            <select {...register('sex')} className={inputCls}>
              <option value="male">Male</option>
              <option value="female">Female</option>
            </select>
            {errors.sex && <p className="mt-0.5 text-xs text-red-600">{errors.sex.message}</p>}
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className="block text-xs font-medium text-gray-700">First name</label>
            <input {...register('first_name')} className={inputCls} />
            {errors.first_name && <p className="mt-0.5 text-xs text-red-600">{errors.first_name.message}</p>}
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700">Middle name</label>
            <input {...register('middle_name')} className={inputCls} />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700">Last name</label>
            <input {...register('last_name')} className={inputCls} />
            {errors.last_name && <p className="mt-0.5 text-xs text-red-600">{errors.last_name.message}</p>}
          </div>
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-700">Date of birth</label>
          <input type="date" {...register('date_of_birth')} className={inputCls} />
          {errors.date_of_birth && <p className="mt-0.5 text-xs text-red-600">{errors.date_of_birth.message}</p>}
        </div>

        {!isEditing && (
          <div>
            <label className="block text-xs font-medium text-gray-700">Class</label>
            <select {...register('class_assignment_id')} className={inputCls} defaultValue="">
              <option value="">{isAdmin ? 'No class yet' : 'Select a class'}</option>
              {classes?.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.grade_level} - {c.section} ({c.subject})
                </option>
              ))}
            </select>
            {errors.class_assignment_id && (
              <p className="mt-0.5 text-xs text-red-600">{errors.class_assignment_id.message}</p>
            )}
            <p className="mt-0.5 text-xs text-gray-500">
              The class sets the student's grade level for the school year.
            </p>
          </div>
        )}

        {!isEditing && isAdmin && !classChosen && (
          <div>
            <label className="block text-xs font-medium text-gray-700">Grade level (active school year)</label>
            <select {...register('grade_level_id')} className={inputCls} defaultValue="">
              <option value="">Not set</option>
              {gradeLevels?.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}
            </select>
          </div>
        )}

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-gray-700">Contact number</label>
            <input {...register('contact_number')} className={inputCls} />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700">Guardian name</label>
            <input {...register('guardian_name')} className={inputCls} />
          </div>
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-700">Guardian contact</label>
          <input {...register('guardian_contact')} className={inputCls} />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-700">Guardian email (optional)</label>
          <input type="email" {...register('guardian_email')} className={inputCls} />
          {errors.guardian_email && <p className="mt-0.5 text-xs text-red-600">{errors.guardian_email.message}</p>}
          <p className="mt-0.5 text-xs text-gray-500">Used for attendance notices if you turn them on in Settings.</p>
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-md px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-100"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="rounded-md bg-blue-700 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-800 disabled:opacity-60"
          >
            {isSubmitting ? 'Saving…' : isEditing ? 'Save changes' : 'Add student'}
          </button>
        </div>
      </form>
    </Modal>
  );
}