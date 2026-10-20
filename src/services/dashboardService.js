import api from './api';

// Path style: if other services call api.get('/api/...'), change this one constant to match them.
const TODAY_URL = '/dashboard/today';

// Counts only. Works whether api returns the axios response or already unwraps it.
export async function getDashboardToday() {
  const res = await api.get(TODAY_URL);
  const body = res && res.data !== undefined ? res.data : res;
  return body && body.data !== undefined ? body.data : body;
}