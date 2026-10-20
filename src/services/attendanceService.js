import api from './api';

export const getAttendance = ({ classId, date }) =>
  api
	.get('/attendance', { params: { class_assignment_id: classId, date } })
	.then((r) => r.data.data);

export const saveAttendance = ({ classId, date, records }) =>
  api
    .post('/attendance/bulk', { class_assignment_id: classId, date, records })
    .then((r) => r.data);