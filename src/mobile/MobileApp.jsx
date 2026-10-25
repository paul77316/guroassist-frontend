import { useCallback, useEffect, useState } from 'react';
import LoginScreen from './screens/LoginScreen';
import ClassesScreen from './screens/ClassesScreen';
import SessionScreen from './screens/SessionScreen';
import { openAccountDb } from './lib/db';
import { getSession, hasLiveToken } from './lib/mobileAuth';
import { logout } from './lib/authActions';
import { cacheGet } from './lib/attendanceStore';
import { resumeSession } from './lib/sessionManager';
import { useAutoSync, useOutboxSummary } from './hooks';

export default function MobileApp() {
  const [phase, setPhase] = useState('boot'); // boot | login | app | storage-error
  const [user, setUser] = useState(null);
  const [view, setView] = useState(null);
  const [classLabel, setClassLabel] = useState('Attendance');
  const [screen, setScreen] = useState('session'); // session | classes
  const [authExpired, setAuthExpired] = useState(false);
  const [notice, setNotice] = useState(null);
  const { summary } = useOutboxSummary();

  useAutoSync(phase === 'app' && !authExpired && summary.total > 0);

  const enter = useCallback(async (account) => {
    try {
      await openAccountDb(account.id);
    } catch {
      setPhase('storage-error');
      return;
    }

    setUser(account);
    setAuthExpired(false);
    try {
      const resumed = await resumeSession();
      setView(resumed);
      setScreen(resumed ? 'session' : 'classes');
    } catch {
      setView(null);
      setScreen('classes');
    }
    setPhase('app');
  }, []);

  useEffect(() => {
    const stored = getSession();
    if (stored?.user && hasLiveToken()) enter(stored.user);
    else {
      if (stored?.user) setNotice('Your sign-in expired. Sign in again. Anything saved on this phone is still here.');
      setPhase('login');
    }
  }, [enter]);

  useEffect(() => {
    const expired = () => setAuthExpired(true);
    window.addEventListener('mobile:unauthenticated', expired);
    window.addEventListener('mobile:device-blocked', expired);
    return () => {
      window.removeEventListener('mobile:unauthenticated', expired);
      window.removeEventListener('mobile:device-blocked', expired);
    };
  }, []);

  useEffect(() => {
    if (!view) return;
    cacheGet('classes').then((classes) => {
      const found = classes?.find((c) => c.id === view.classId);
      if (found) setClassLabel(`${found.grade_level} - ${found.section} (${found.subject})`);
    }).catch(() => {});
  }, [view?.classId]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleAuthProblem = useCallback((error) => {
    if (error?.status === 401 || error?.status === 403) setAuthExpired(true);
  }, []);

  const signOut = async () => {
    const unsynced = summary.total > 0;
    const message = unsynced
      ? 'You have attendance that is not confirmed by the server yet. It stays on this phone until you sign in again. Sign out now?'
      : 'Sign out? You can also clear this phone’s attendance data.';
    if (!window.confirm(message)) return;

    const wipe = !unsynced && window.confirm('Also clear the attendance data saved on this phone? (Recommended on a shared phone.)');
    try {
      await logout({ userId: user?.id, wipe });
    } catch (e) {
      window.alert(e.message);
      return;
    }
    setUser(null);
    setView(null);
    setNotice(null);
    setPhase('login');
  };

  if (phase === 'boot') return <p className="p-6 text-gray-600">Starting…</p>;

  if (phase === 'storage-error') {
    return (
      <main className="mx-auto max-w-sm p-6" role="alert">
        <h1 className="text-xl font-bold text-red-800">Offline storage isn’t available</h1>
        <p className="mt-2 text-sm text-gray-800">
          This browser can’t save attendance on the phone, so the app can’t be used safely. Close private browsing, free up space, or install the app from Chrome or Safari, then reopen it.
        </p>
      </main>
    );
  }

  if (phase === 'login') {
    return <LoginScreen initialEmail={getSession()?.user?.email ?? ''} notice={notice} onSignedIn={enter} />;
  }

  if (screen === 'classes' || !view) {
    return (
      <ClassesScreen
        onBack={view ? () => setScreen('session') : null}
        onAuthProblem={handleAuthProblem}
        onOpened={(opened) => { setView(opened); setScreen('session'); }}
      />
    );
  }

  return (
    <SessionScreen
      view={view}
      classLabel={classLabel}
      authExpired={authExpired}
      onViewChange={setView}
      onChangeSession={() => setScreen('classes')}
      onSignIn={() => { setNotice('Sign in to sync your changes.'); setPhase('login'); }}
      onSignOut={signOut}
    />
  );
}
