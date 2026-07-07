import { useCallback, useEffect, useState } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { fetchMe } from './api';
import LoginPage from './pages/LoginPage';
import CallbackPage from './pages/CallbackPage';
import DashboardPage from './pages/DashboardPage';

function App() {
  const [session, setSession] = useState({ status: 'loading', user: null });

  useEffect(() => {
    let cancelled = false;
    fetchMe().then(({ ok, payload }) => {
      if (cancelled) return;
      setSession(
        ok
          ? { status: 'signed-in', user: payload.data }
          : { status: 'signed-out', user: null }
      );
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const handleSignedIn = useCallback(
    (user) => setSession({ status: 'signed-in', user }),
    []
  );
  const handleSignedOut = useCallback(
    () => setSession({ status: 'signed-out', user: null }),
    []
  );

  if (session.status === 'loading') {
    return (
      <main className="page">
        <p>Loading…</p>
      </main>
    );
  }

  return (
    <Routes>
      <Route
        path="/auth/callback"
        element={<CallbackPage onSignedIn={handleSignedIn} />}
      />
      <Route
        path="/"
        element={
          session.status === 'signed-in' ? (
            <DashboardPage user={session.user} onSignedOut={handleSignedOut} />
          ) : (
            <LoginPage />
          )
        }
      />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default App;
