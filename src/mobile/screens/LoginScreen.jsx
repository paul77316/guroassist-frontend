import { useState } from 'react';
import { login } from '../lib/authActions';

const EXPLAIN = {
  mobile_not_available: 'The mobile app is for teacher accounts.',
  password_change_required: 'Change your initial password on the web first, then come back.',
  device_revoked: 'This phone was removed. Ask an administrator.',
};

export default function LoginScreen({ initialEmail = '', notice = null, onSignedIn }) {
  const [email, setEmail] = useState(initialEmail);
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const [pending, setPending] = useState(false);

  const submit = async (event) => {
    event.preventDefault();
    setBusy(true);
    setError(null);

    try {
      const result = await login({ email, password });
      if (result.state === 'pending') setPending(true);
      else onSignedIn(result.user);
    } catch (e) {
      if (e?.status === null) setError('No connection. Sign-in needs the internet. Work already saved on this phone stays safe.');
      else if (e?.status === 422) setError(e.errors?.email?.[0] ?? 'Check your email, password and try again.');
      else if (e?.status === 429) setError('Too many attempts. Wait a minute and try again.');
      else setError(EXPLAIN[e?.code] ?? e?.message ?? 'Could not sign in.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="mx-auto flex min-h-screen max-w-sm flex-col justify-center gap-4 p-6">
      <h1 className="text-2xl font-bold text-gray-900">GuroAssist Attendance</h1>
      {notice && <p role="status" className="rounded-lg bg-amber-100 p-3 text-sm text-amber-900">{notice}</p>}

      {pending ? (
        <div className="rounded-xl border-2 border-amber-300 bg-amber-50 p-4 text-sm text-amber-900" role="status">
          <p className="font-semibold">Waiting for approval</p>
          <p className="mt-1">An administrator must approve this phone before you can take attendance. Tap the button after they have.</p>
          <button onClick={submit} disabled={busy} className="mt-3 min-h-12 w-full rounded-lg bg-blue-700 text-white disabled:opacity-50">{busy ? 'Checking…' : 'Check again'}</button>
        </div>
      ) : (
        <form onSubmit={submit} className="space-y-3">
          <label className="block text-sm font-medium text-gray-800">
            Email
            <input type="email" autoComplete="username" required value={email} onChange={(e) => setEmail(e.target.value)} className="mt-1 min-h-12 w-full rounded-lg border border-gray-400 px-3 text-base" />
          </label>
          <label className="block text-sm font-medium text-gray-800">
            Password
            <input type="password" autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.target.value)} className="mt-1 min-h-12 w-full rounded-lg border border-gray-400 px-3 text-base" />
          </label>
          {error && <p role="alert" className="text-sm font-medium text-red-700">{error}</p>}
          <button type="submit" disabled={busy} className="min-h-12 w-full rounded-lg bg-blue-700 font-semibold text-white disabled:opacity-50">{busy ? 'Signing in…' : 'Sign in'}</button>
        </form>
      )}
    </main>
  );
}
