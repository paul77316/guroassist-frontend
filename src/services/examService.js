import api from './api';

// Limits for the forms: choice counts, the question limit, the image limits.
export const getExamOptions = () => api.get('/exam-options').then((r) => r.data.data);

// ---- competencies (personal to the teacher) ----
export const listCompetencies = () => api.get('/competencies').then((r) => r.data.data);
export const createCompetency = (payload) => api.post('/competencies', payload).then((r) => r.data.data);
export const updateCompetency = ({ id, ...payload }) => api.put(`/competencies/${id}`, payload).then((r) => r.data.data);
export const deleteCompetency = (id) => api.delete(`/competencies/${id}`);

// ---- exams and sets ----
// List rows carry counts and no question text. trashed => only deleted ones.
export const listExams = ({ classId, trashed }) =>
  api
    .get('/exams', {
      params: {
        class_assignment_id: classId || undefined,
        trashed: trashed ? 'only' : undefined,
      },
    })
    .then((r) => r.data.data);

export const getExam = (id) => api.get(`/exams/${id}`).then((r) => r.data.data);
export const createExam = (payload) => api.post('/exams', payload).then((r) => r.data.data);
export const updateExam = ({ id, ...payload }) => api.put(`/exams/${id}`, payload).then((r) => r.data.data);
export const deleteExam = (id) => api.delete(`/exams/${id}`);
export const restoreExam = (id) => api.post(`/exams/${id}/restore`).then((r) => r.data.data);

export const addSet = (examId) => api.post(`/exams/${examId}/sets`).then((r) => r.data.data);
// One set with its questions (full text and the answer key).
export const getExamSet = (id) => api.get(`/exam-sets/${id}`).then((r) => r.data.data);
export const deleteExamSet = (id) => api.delete(`/exam-sets/${id}`);

// ---- questions ----
export const createQuestion = ({ setId, ...payload }) =>
  api.post(`/exam-sets/${setId}/questions`, payload).then((r) => r.data.data);
export const updateQuestion = ({ id, ...payload }) =>
  api.put(`/exam-questions/${id}`, payload).then((r) => r.data.data);
export const deleteQuestion = (id) => api.delete(`/exam-questions/${id}`);
// ids: every question id of the set in the new order. Returns the set with its questions.
export const reorderQuestions = ({ setId, ids }) =>
  api.put(`/exam-sets/${setId}/questions/order`, { ids }).then((r) => r.data.data);

// ---- question image (one per question) ----
export const uploadQuestionImage = ({ id, file, alt }) => {
  const form = new FormData();
  form.append('image', file);
  if (alt) form.append('alt', alt);
  return api.post(`/exam-questions/${id}/image`, form).then((r) => r.data.data);
};
export const removeQuestionImage = (id) => api.delete(`/exam-questions/${id}/image`);
// The image needs the login cookie, so it is fetched as a file and shown from a temporary address.
export const getQuestionImage = (id) =>
  api.get(`/exam-questions/${id}/image`, { responseType: 'blob' }).then((r) => r.data);