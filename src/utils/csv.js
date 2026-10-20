// Stops spreadsheets from running a cell that starts with = + - @ as a formula
const safe = (v) => {
  const s = v == null ? '' : String(v);
  return /^[=+\-@\t\r]/.test(s) ? `'${s}` : s;
};

export const toCsv = (rows) =>
  '\uFEFF' + rows.map((r) => r.map((v) => `"${safe(v).replace(/"/g, '""')}"`).join(',')).join('\r\n');