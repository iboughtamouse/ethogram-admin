import { useCallback, useEffect, useState } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { fetchMe } from './api';
import Layout from './components/Layout';
import LoginPage from './pages/LoginPage';
import CallbackPage from './pages/CallbackPage';
import OverviewPage from './pages/OverviewPage';
import AviaryPage from './pages/AviaryPage';
import VocabularyPage from './pages/VocabularyPage';
import VersionsPage from './pages/VersionsPage';
import SubmissionsPage from './pages/SubmissionsPage';

function App() {
  const [session, setSession] = useState({ status: 'loading', user: null });

  useEffect(() => {
    let cancelled = false;
    fetchMe().then(({ ok, payload }) => {
      if (cancelled) return;
      setSession(
        ok && payload?.data
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

  if (session.status === 'signed-out') {
    return (
      <Routes>
        <Route
          path="/auth/callback"
          element={<CallbackPage onSignedIn={handleSignedIn} />}
        />
        <Route path="*" element={<LoginPage />} />
      </Routes>
    );
  }

  return (
    <Layout user={session.user} onSignedOut={handleSignedOut}>
      <Routes>
        <Route path="/" element={<OverviewPage />} />
        <Route path="/aviaries/:slug" element={<AviaryPage />} />
        <Route path="/vocabulary" element={<VocabularyPage />} />
        <Route path="/versions" element={<VersionsPage />} />
        <Route path="/submissions" element={<SubmissionsPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Layout>
  );
}

export default App;
