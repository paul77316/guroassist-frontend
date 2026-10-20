import api from './api';

export const getClasses = () => api.get('/class-assignments').then((r) => r.data.data);
export const createClass = (payload) => api.post('/class-assignments', payload).then((r) => r.data.data);
export const updateClass = ({ id, ...payload }) => api.put(`/class-assignments/${id}`, payload).then((r) => r.data.data);
export const archiveClass = (id) => api.delete(`/class-assignments/${id}`);
export const getClassStudents = (id) =>
  api.get(`/class-assignments/${id}/students`).then((r) => r.data.data);
export const getCandidates = (id, search) =>
  api.get(`/class-assignments/${id}/student-candidates`, { params: search ? { search } : {} }).then((r) => r.data.data);
export const enrollStudents = (id, payload) =>
  api.post(`/class-assignments/${id}/students`, payload).then((r) => r.data); // { data: roster, added }
export const removeStudent = (id, studentId) =>
  api.delete(`/class-assignments/${id}/students/${studentId}`);
export const importStudents = (id, file, confirm) => {
  const form = new FormData();
  form.append('file', file);
  form.append('confirm', confirm ? '1' : '0');
  return api.post(`/class-assignments/${id}/students/import`, form).then((r) => r.data.data);
};
export const downloadRoster = (id) =>
  api.get(`/class-assignments/${id}/students/export`, { responseType: 'blob' }).then((r) => r.data);
export const downloadImportTemplate = () =>
  api.get('/templates/student-import', { responseType: 'blob' }).then((r) => r.data);