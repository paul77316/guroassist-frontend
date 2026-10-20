import api from './api';

export const getGradeLevels = () => api.get('/grade-levels').then((r) => r.data.data);
export const getSubjects = () => api.get('/subjects').then((r) => r.data.data);
export const getAcademicYears = () => api.get('/academic-years').then((r) => r.data.data);
export const getTerms = () => api.get('/terms').then((r) => r.data.data);