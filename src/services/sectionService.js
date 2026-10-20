import api from './api'; 
export async function fetchSections() {
     const { data } = await api.get('/sections');
     return data.data;
}
