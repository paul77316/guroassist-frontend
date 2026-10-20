// The api.js interceptor rejects { status, message, errors }. Show the first useful message.
export const firstError = (err, fallback = 'Something went wrong. Please try again.') =>
  Object.values(err?.errors ?? {}).flat()[0] ?? err?.message ?? fallback;
