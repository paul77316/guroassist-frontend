import api from './api'; 
export async function fetchStudents(params = {}) {
     const { data } = await api.get('/students', { params });
     return data;
}

export async function fetchStudent(id) {
     const { data } = await api.get(`/students/${id}`);
     return data.data;
}

export async function createStudent(payload) {
     const { data } = await api.post('/students', payload);
     return data.data;
}

export async function updateStudent(id, payload) {
     const { data } = await api.put(`/students/${id}`, payload);
     return data.data;
}

export async function archiveStudent(id) {
     await api.delete(`/students/${id}`);
}
export async function fetchStudentProfile(id) {
  const { data } = await api.get(`/students/${id}/profile`);
  return data.data;
}