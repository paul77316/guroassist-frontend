// Local dates as "YYYY-MM-DD". toISOString() is UTC and can return yesterday in PH time.
const pad = (n) => String(n).padStart(2, '0');

export const fmtDate = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

export const todayLocal = () => fmtDate(new Date());

export const addDays = (ymd, n) => {
  const [y, m, d] = ymd.split('-').map(Number);
  return fmtDate(new Date(y, m - 1, d + n));
};

// "2030-03-05" -> "Tue, Mar 5, 2030" (built from parts so the date never shifts with the timezone)
export const prettyDate = (ymd) => {
  if (!ymd) return '';
  const [y, m, d] = ymd.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString('en-PH', {
    weekday: 'short', month: 'short', day: 'numeric', year: 'numeric',
  });
};
