import api from './api';

// Marking happens only in the mobile app. The web reads confirmed attendance, and admins can correct a mark.
export const getAttendance = ({ classId, date }) =>
  api
    .get('/attendance', { params: { class_assignment_id: classId, date } })
    .then((r) => r.data.data);

export const correctAttendance = ({ classId, studentId, date, status, reason, version }) =>
  api
    .post('/admin/attendance/corrections', {
      class_assignment_id: classId,
      student_id: studentId,
      date,
      status,
      reason,
      version,
    })
    .then((r) => r.data.data);

export const getSeatingLayout = (classId) =>
  api.get(`/class-assignments/${classId}/seating-layout`).then((r) => r.data.data);

export const saveSeatingLayout = ({ classId, ...payload }) =>
  api.put(`/class-assignments/${classId}/seating-layout`, payload).then((r) => r.data.data);
