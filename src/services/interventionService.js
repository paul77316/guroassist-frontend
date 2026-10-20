import api from './api';

// Lists and statuses for the forms (concern types, intervention types, outcomes, statuses).
export const getInterventionOptions = () => api.get('/intervention-options').then((r) => r.data.data);

// List rows carry no free text. trashed => only deleted ones.
export const listInterventions = ({ studentId, classId, trashed }) =>
  api
    .get(`/students/${studentId}/interventions`, {
      params: {
        class_assignment_id: classId || undefined,
        trashed: trashed ? 'only' : undefined,
      },
    })
    .then((r) => r.data.data);

// The detail has the text, the student, the follow-up history and the allowed next statuses.
export const getIntervention = (id) => api.get(`/interventions/${id}`).then((r) => r.data.data);

export const createIntervention = ({ studentId, ...payload }) =>
  api.post(`/students/${studentId}/interventions`, payload).then((r) => r.data.data);

export const updateIntervention = ({ id, ...payload }) =>
  api.put(`/interventions/${id}`, payload).then((r) => r.data.data);

export const deleteIntervention = (id) => api.delete(`/interventions/${id}`);

export const restoreIntervention = (id) => api.post(`/interventions/${id}/restore`).then((r) => r.data.data);

// Record a follow-up, reschedule, completion or reopen. Returns the updated intervention.
export const addFollowup = ({ id, ...payload }) =>
  api.post(`/interventions/${id}/followups`, payload).then((r) => r.data.data);

// Returns { data: [...], meta: { today } }
export const listDueFollowUps = () => api.get('/follow-ups/due').then((r) => r.data);

// Students who match a review prompt in any of the teacher's classes, one row per student.
// Returns { data: [...], meta: { classes, period, today } }
export const getStudentsToReview = () => api.get('/monitoring/students-to-review').then((r) => r.data);

// The user's own open interventions keyed by student id: { "12": { active_count, follow_up_due } }. Counts only.
export const getActiveInterventions = () => api.get('/monitoring/active-interventions').then((r) => r.data.data);

// The teacher's own interventions across students, 25 per page. No free text in the rows.
// params: { status, class_assignment_id, concern_type, outcome, search, page }
// Returns { data: [...], meta: { current_page, last_page, total } }
export const listAllInterventions = (params) => api.get('/interventions', { params }).then((r) => r.data);
