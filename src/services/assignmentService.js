import api from './api';

export const listAssignments = ({ classId, scope, trashed }) =>
  api
    .get('/assignments', {
      params: {
        class_assignment_id: classId,
        scope: scope || undefined,
        trashed: trashed ? 'only' : undefined,
      },
    })
    .then((r) => r.data.data);

export const getAssignment = (id) => api.get(`/assignments/${id}`).then((r) => r.data.data);

export const createAssignment = (payload) => api.post('/assignments', payload).then((r) => r.data.data);

// returns { assignment, recalculated }: how many stored submissions were re-checked against a new due date
export const updateAssignment = ({ id, ...payload }) =>
  api.put(`/assignments/${id}`, payload).then((r) => ({
    assignment: r.data.data,
    recalculated: r.data.meta?.recalculated ?? 0,
  }));

export const deleteAssignment = (id) => api.delete(`/assignments/${id}`);

export const restoreAssignment = (id) => api.post(`/assignments/${id}/restore`).then((r) => r.data.data);

// returns { changed, data: the refreshed grid }
export const saveSubmissions = ({ id, records }) =>
  api.put(`/assignments/${id}/submissions`, { records }).then((r) => r.data);

export const getMissingWork = (classId) =>
  api.get('/assignments/missing', { params: { class_assignment_id: classId } }).then((r) => r.data.data);
