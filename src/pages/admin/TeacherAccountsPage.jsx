import { useState } from 'react';
import { useTeacherAccounts } from '../../hooks/useAdmin';
import Pagination from '../../components/ui/Pagination';
import TeacherAccountFormModal from './TeacherAccountFormModal';
import TeacherPasswordResetModal from './TeacherPasswordResetModal';

export default function TeacherAccountsPage() {
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(20);
  const [editingTeacher, setEditingTeacher] = useState(null);
  const [resettingTeacher, setResettingTeacher] = useState(null);
  const [accountNotice, setAccountNotice] = useState(null);
  const { data, isLoading, isFetching, isError } = useTeacherAccounts({ page, perPage });
  const teachers = data?.data ?? [];
  const meta = data?.meta;
  const [formOpen, setFormOpen] = useState(false);

  return (
    <div>
      <div className="mb-4 flex flex-col items-stretch justify-between gap-3 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Teacher Accounts</h1>
          <p className="text-sm text-gray-500">Register teacher logins and manage their employee details.</p>
        </div>
        <button onClick={() => { setEditingTeacher(null); setFormOpen(true); }} className="w-full rounded-md bg-blue-600 px-4 py-2.5 text-sm text-white hover:bg-blue-700 sm:w-auto">
          Add Teacher
        </button>
      </div>

      {accountNotice && (
        <p role="status" className={`mb-4 rounded-md border px-4 py-3 text-sm ${accountNotice.sent
          ? 'border-green-200 bg-green-50 text-green-700'
          : 'border-amber-200 bg-amber-50 text-amber-800'}`}>
          {accountNotice.message}
        </p>
      )}

      <section className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
        <div className="flex items-center justify-between border-b border-gray-200 px-4 py-3">
          <h2 className="text-base font-semibold text-gray-900">Registered teachers</h2>
          {!isLoading && !isError && (
            <span className="rounded-full bg-blue-50 px-2.5 py-1 text-xs font-medium text-blue-700">
              {meta?.total ?? teachers.length} {(meta?.total ?? teachers.length) === 1 ? 'teacher' : 'teachers'}
            </span>
          )}
        </div>
        {isLoading && <p className="p-6 text-sm text-gray-500">Loading teacher accounts…</p>}
        {isError && <p className="p-6 text-sm text-red-600">Could not load teacher accounts. Refresh and try again.</p>}
        {!isLoading && !isError && (meta?.total ?? teachers.length) === 0 && (
          <p className="p-6 text-sm text-gray-500">No teacher accounts yet. Register the first account above.</p>
        )}
        {!isError && teachers.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-gray-50 text-xs uppercase text-gray-500">
                <tr>
                  <th className="px-4 py-2">Teacher</th>
                  <th className="px-4 py-2">Employee ID</th>
                  <th className="px-4 py-2">Contact</th>
                  <th className="px-4 py-2 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {teachers.map((teacher) => (
                  <tr key={teacher.id}>
                    <td className="px-4 py-2">
                      <p className="font-medium text-gray-900">{teacher.name}</p>
                      <p className="text-gray-500">{teacher.email}</p>
                    </td>
                    <td className="px-4 py-2 text-gray-600">{teacher.employee_id}</td>
                    <td className="px-4 py-2 text-gray-600">{teacher.contact_number || '—'}</td>
                    <td className="space-x-3 px-4 py-2 text-right">
                      <button onClick={() => setEditingTeacher(teacher)} className="text-blue-600 hover:underline">Edit</button>
                      <button onClick={() => setResettingTeacher(teacher)} className="text-blue-600 hover:underline">Reset password</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <Pagination
        meta={meta}
        noun="teachers"
        busy={isFetching}
        onPage={setPage}
        onPerPage={(value) => { setPerPage(value); setPage(1); }}
      />

      {(formOpen || editingTeacher) && (
        <TeacherAccountFormModal
          teacher={editingTeacher}
          onClose={() => { setEditingTeacher(null); setFormOpen(false); }}
          onCreated={(result) => {
            setPage(1);
            setAccountNotice({
              sent: result.welcome_email_sent,
              message: result.welcome_email_sent
                ? 'Teacher account created and welcome email sent.'
                : 'Teacher account created, but the welcome email could not be sent. Use Reset password to retry or share the temporary password securely.',
            });
          }}
        />
      )}
      {resettingTeacher && (
        <TeacherPasswordResetModal
          teacher={resettingTeacher}
          onClose={() => setResettingTeacher(null)}
          onReset={(result) => setAccountNotice({
            sent: result.welcome_email_sent,
            message: result.welcome_email_sent
              ? 'Password reset and email sent to the teacher.'
              : 'Password reset, but email delivery failed. Share the new password securely and check the mail configuration.',
          })}
        />
      )}
    </div>
  );
}
