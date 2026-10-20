/**
 * Map the interceptor's { message, errors } onto react-hook-form.
 * Keys whose first segment is in `known` become field errors (e.g. "components.0.weight"
 * lands on "components"); anything else is shown as a form-level message.
 */
export function applyServerErrors(err, setError, known) {
  const errs = err?.errors;
  if (!errs || Object.keys(errs).length === 0) {
	setError('root', { message: err?.message ?? 'Something went wrong. Please try again.' });
	return;
  }
  const rootMsgs = [];
  Object.entries(errs).forEach(([key, msgs]) => {
	const msg = Array.isArray(msgs) ? msgs[0] : msgs;
	const top = key.split('.')[0];
	if (known.includes(top)) setError(top, { message: msg });
	else rootMsgs.push(msg);
  });
  if (rootMsgs.length) setError('root', { message: rootMsgs.join(' ') });
}