import api from './api';

export const getAttendanceSummary = ({ classId, from, to }) =>
  api
    .get('/attendance/summary', { params: { class_assignment_id: classId, from, to } })
    .then((r) => r.data.data);

export const getMonitoringSettings = () => api.get('/monitoring/settings').then((r) => r.data.data);
export const saveMonitoringSettings = (payload) =>
  api.put('/monitoring/settings', payload).then((r) => r.data.data);
export const getStudentAttendance = ({ classId, studentId, from, to }) =>
  api.get('/attendance/student', { params: { class_assignment_id: classId, student_id: studentId, from, to } }).then((r) => r.data.data);