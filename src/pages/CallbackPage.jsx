import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import PropTypes from 'prop-types';
import { verifyToken } from '../api';

/**
 * Magic-link landing page. The single-use token arrives in the URL fragment
 * (never sent to any server); it is captured and stripped from the address
 * bar/history immediately, and redeemed only by an explicit button click —
 * email security scanners that prefetch links can never consume it.
 */
function CallbackPage({ onSignedIn }) {
  const [token] = useState(() => {
    const fromFragment = new URLSearchParams(window.location.hash.slice(1)).get(
      'token'
    );
    if (fromFragment) {
      window.history.replaceState(
        null,
        '',
        window.location.pathname + window.location.search
      );
    }
    return fromFragment;
  });
  const [state, setState] = useState('idle'); // idle | verifying | error
  const [error, setError] = useState('');
  const navigate = useNavigate();

  async function handleSignIn() {
    setState('verifying');
    const { ok, payload } = await verifyToken(token);
    if (ok) {
      onSignedIn(payload.data);
      navigate('/', { replace: true });
    } else {
      setState('error');
      setError(payload?.error || 'Sign-in failed. Please request a new link.');
    }
  }

  if (!token) {
    return (
      <main className="page card">
        <h1>WBS Ethogram Admin</h1>
        <p>This sign-in link is incomplete or has already been opened.</p>
        <p>
          <Link to="/">Request a new sign-in link</Link>
        </p>
      </main>
    );
  }

  return (
    <main className="page card">
      <h1>WBS Ethogram Admin</h1>
      <p>You&apos;re one click away from the dashboard.</p>
      <button
        type="button"
        onClick={handleSignIn}
        disabled={state === 'verifying'}
      >
        {state === 'verifying' ? 'Signing in…' : 'Sign in'}
      </button>
      {state === 'error' && (
        <p role="alert">
          {error} <Link to="/">Request a new link</Link>
        </p>
      )}
    </main>
  );
}

CallbackPage.propTypes = {
  onSignedIn: PropTypes.func.isRequired,
};

export default CallbackPage;
