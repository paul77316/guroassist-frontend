import api from './api';

export const listTerms = () => api.get('/admin/terms').then((r) => r.data.data);
export const createTerm = (p) => api.post('/admin/terms', p).then((r) => r.data.data);
export const updateTerm = ({ id, ...p }) => api.put(`/admin/terms/${id}`, p).then((r) => r.data.data);
export const deleteTerm = (id) => api.delete(`/admin/terms/${id}`);
// Generic admin lists: 'academic-years' | 'grade-levels' | 'subjects'
export const listSetup = (path) => api.get(`/admin/${path}`).then((r) => r.data.data);
export const createSetup = (path, p) => api.post(`/admin/${path}`, p).then((r) => r.data.data);
export const updateSetup = (path, { id, ...p }) => api.put(`/admin/${path}/${id}`, p).then((r) => r.data.data);
export const deleteSetup = (path, id) => api.delete(`/admin/${path}/${id}`);

export const listTeacherAccounts = ({ page = 1, perPage = 20 } = {}) =>
  api.get('/admin/teachers', { params: { page, per_page: perPage } }).then((r) => r.data);
export const createTeacherAccount = (payload) => api.post('/admin/teachers', payload).then((r) => r.data.data);
export const updateTeacherAccount = ({ id, ...payload }) =>
  api.put(`/admin/teachers/${id}`, payload).then((r) => r.data.data);
export const resetTeacherPassword = ({ id, ...payload }) =>
  api.put(`/admin/teachers/${id}/password`, payload).then((r) => r.data.data);
