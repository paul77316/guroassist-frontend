import api from './api';

const getLookupItems = async (endpoint) => {
  const response = await api.get(endpoint);
  let items = response.data?.data ?? response.data;

  // Some API responses wrap the Laravel `data` payload one extra time.
  if (!Array.isArray(items) && Array.isArray(items?.data)) {
    items = items.data;
  }

  if (!Array.isArray(items)) {
    throw new Error(`Expected an array from ${endpoint}, received ${items === null ? 'null' : typeof items}.`);
  }

  return items;
};

export const getGradeLevels = () => getLookupItems('/grade-levels');
export const getSubjects = () => getLookupItems('/subjects');
export const getAcademicYears = () => getLookupItems('/academic-years');
export const getTerms = () => getLookupItems('/terms');
