import { useState } from 'react';
import PropTypes from 'prop-types';
import { logout } from '../api';

function DashboardPage({ user, onSignedOut }) {
  const [signingOut, setSigningOut] = useState(false);

  async function handleSignOut() {
    setSigningOut(true);
    await logout(); // even if the call fails, drop the local session
    onSignedOut();
  }

  return (
    <div className="page">
      <header className="topbar">
        <h1>WBS Ethogram Admin</h1>
        <div className="whoami">
          <span>Signed in as {user.displayName}</span>
          <button type="button" onClick={handleSignOut} disabled={signingOut}>
            {signingOut ? 'Signing out…' : 'Sign out'}
          </button>
        </div>
      </header>
      <main>
        <p>
          You&apos;re signed in. Aviaries, vocabulary, and publishing arrive in
          stages 3B–3C.
        </p>
      </main>
    </div>
  );
}

DashboardPage.propTypes = {
  user: PropTypes.shape({
    email: PropTypes.string.isRequired,
    displayName: PropTypes.string.isRequired,
  }).isRequired,
  onSignedOut: PropTypes.func.isRequired,
};

export default DashboardPage;
