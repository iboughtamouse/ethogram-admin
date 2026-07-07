import { useState } from 'react';
import { NavLink } from 'react-router-dom';
import PropTypes from 'prop-types';
import { logout } from '../api';

function Layout({ user, onSignedOut, children }) {
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
      <nav className="mainnav" aria-label="Main">
        <NavLink to="/" end>
          Overview
        </NavLink>
        <NavLink to="/vocabulary">Vocabulary</NavLink>
        <NavLink to="/versions">Versions</NavLink>
        <NavLink to="/submissions">Submissions</NavLink>
      </nav>
      <main>{children}</main>
    </div>
  );
}

Layout.propTypes = {
  user: PropTypes.shape({
    email: PropTypes.string.isRequired,
    displayName: PropTypes.string.isRequired,
  }).isRequired,
  onSignedOut: PropTypes.func.isRequired,
  children: PropTypes.node.isRequired,
};

export default Layout;
