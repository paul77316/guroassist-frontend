import api from './api';

// Counts only: no names and no text. enabled is false when the teacher has not opted in.
export const getNotificationSummary = () => api.get('/notifications/summary').then((r) => r.data.data);

export const getNotificationPreferences = () => api.get('/notifications/preferences').then((r) => r.data.data);

export const saveNotificationPreferences = (payload) =>
  api.put('/notifications/preferences', payload).then((r) => r.data.data);