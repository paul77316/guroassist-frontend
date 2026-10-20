import api from './api';

// List rows carry no reason or summary text. trashed => only deleted ones.
export const listCommunications = ({ studentId, classId, trashed }) =>
  api
    .get(`/students/${studentId}/parent-communications`, {
      params: {
        class_assignment_id: classId || undefined,
        trashed: trashed ? 'only' : undefined,
      },
    })
    .then((r) => r.data.data);

// The detail has the reason and the summary.
export const getCommunication = (id) => api.get(`/parent-communications/${id}`).then((r) => r.data.data);

// This logs contact that already happened. Nothing is sent to anyone.
export const createCommunication = ({ studentId, ...payload }) =>
  api.post(`/students/${studentId}/parent-communications`, payload).then((r) => r.data.data);

export const updateCommunication = ({ id, ...payload }) =>
  api.put(`/parent-communications/${id}`, payload).then((r) => r.data.data);

export const deleteCommunication = (id) => api.delete(`/parent-communications/${id}`);

export const restoreCommunication = (id) =>
  api.post(`/parent-communications/${id}/restore`).then((r) => r.data.data);


// The server stamps the done date (school timezone). Undo clears it.
export const markCommunicationFollowUpDone = (id) =>
  api.post(`/parent-communications/${id}/follow-up-done`).then((r) => r.data.data);

export const undoCommunicationFollowUpDone = (id) =>
  api.delete(`/parent-communications/${id}/follow-up-done`).then((r) => r.data.data);