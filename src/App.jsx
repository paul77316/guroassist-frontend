import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import AuthLayout from './layouts/AuthLayout';
import DashboardLayout from './layouts/DashboardLayout';
import ProtectedRoute from './routes/ProtectedRoute';
import TeacherRoute from './routes/TeacherRoute';
import AdminRoute from './routes/AdminRoute';
import Login from './pages/auth/Login';
import InitialPasswordPage from './pages/auth/InitialPasswordPage';
import Dashboard from './pages/dashboard/Dashboard';
import StudentsList from './pages/students/StudentsList'
import ClassesList from './pages/classes/ClassesList';
import ClassDetailPage from './pages/classes/ClassDetailPage';
import AttendancePage from './pages/attendance/AttendancePage';
import SeatingPage from './pages/attendance/SeatingPage';
import MobileDevicesPage from './pages/admin/MobileDevicesPage';
import TermsPage from './pages/admin/TermsPage';
import SetupPage from './pages/admin/SetupPage';
import AttendanceReportPage from './pages/attendance/AttendanceReportPage';
import SettingsPage from './pages/settings/SettingsPage'
import ComingSoon from './pages/ComingSoon'
import AssignmentsPage from './pages/assignments/AssignmentsPage';
import MissingWorkPage from './pages/assignments/MissingWorkPage';
import AssignmentGridPage from './pages/assignments/AssignmentGridPage';
import InterventionsPage from './pages/interventions/InterventionsPage';
import ExamsPage from './pages/exams/ExamsPage';
import ExamDetailPage from './pages/exams/ExamDetailPage';
import ExamPrintPage from './pages/exams/ExamPrintPage';
import TeacherAccountsPage from './pages/admin/TeacherAccountsPage';


export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<AuthLayout />}>
          <Route path="/login" element={<Login />} />
          <Route element={<ProtectedRoute />}>
            <Route path="/initial-password" element={<InitialPasswordPage />} />
          </Route>
        </Route>

        <Route element={<ProtectedRoute />}>
          <Route element={<TeacherRoute />}>
            <Route path="/exams/:id/print" element={<ExamPrintPage />} />
          </Route>
          <Route element={<DashboardLayout />}>
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/students" element={<StudentsList />} />
            <Route path="/classes" element={<ClassesList />} />
            <Route path="/attendance" element={<AttendancePage />} />
            <Route path="/attendance/seating" element={<SeatingPage />} />
            <Route path="/classes/:id" element={<ClassDetailPage />} />
            <Route path="/attendance/report" element={<AttendanceReportPage />} />
            <Route path="/interventions" element={<InterventionsPage />} />
            <Route path="/reports" element={<ComingSoon />} />
            <Route path="/ai" element={<ComingSoon />} />
            <Route path="/assignments" element={<AssignmentsPage />} />
            <Route path="/assignments/missing" element={<MissingWorkPage />} />
            <Route path="/assignments/:id" element={<AssignmentGridPage />} />
            <Route element={<TeacherRoute />}>
              <Route path="/settings" element={<SettingsPage />} />
              <Route path="/exams" element={<ExamsPage />} />
              <Route path="/exams/:id" element={<ExamDetailPage />} />
            </Route>
            <Route element={<AdminRoute />}>
              <Route path="/admin/teachers" element={<TeacherAccountsPage />} />
              <Route path="/admin/devices" element={<MobileDevicesPage />} />
              <Route path="/admin/terms" element={<TermsPage />} />
              <Route path="/admin/academic-years" element={<SetupPage key="academic-years" path="academic-years" />} />
              <Route path="/admin/grade-levels" element={<SetupPage key="grade-levels" path="grade-levels" />} />
              <Route path="/admin/subjects" element={<SetupPage key="subjects" path="subjects" />} />
            </Route>

          </Route>
        </Route>
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
