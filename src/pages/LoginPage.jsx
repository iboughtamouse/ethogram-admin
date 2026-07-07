import { useState } from 'react';
import { requestLink } from '../api';

function LoginPage() {
  const [email, setEmail] = useState('');
  const [state, setState] = useState('idle'); // idle | sending | sent | error
  const [error, setError] = useState('');
  // The address the link was actually sent to, frozen at submit time — the
  // input keeps living during the async send, so echoing live `email` could
  // show a value the link never went to.
  const [sentTo, setSentTo] = useState('');

  async function handleSubmit(event) {
    event.preventDefault();
    const trimmed = email.trim();
    if (!trimmed) return;

    setState('sending');
    const { ok, payload } = await requestLink(trimmed);
    if (ok) {
      setSentTo(trimmed);
      setState('sent');
    } else {
      setState('error');
      setError(payload?.error || 'Something went wrong. Please try again.');
    }
  }

  if (state === 'sent') {
    return (
      <main className="page card">
        <h1>WBS Ethogram Admin</h1>
        <p role="status">
          If <strong>{sentTo}</strong> is on the admin list, a sign-in link is
          on its way. It expires in 15 minutes — check your inbox.
        </p>
      </main>
    );
  }

  return (
    <main className="page card">
      <h1>WBS Ethogram Admin</h1>
      <p>Enter your email and we&apos;ll send you a sign-in link.</p>
      <form onSubmit={handleSubmit}>
        <label htmlFor="login-email">Email</label>
        <input
          id="login-email"
          type="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          autoComplete="email"
          required
        />
        <button type="submit" disabled={state === 'sending'}>
          {state === 'sending' ? 'Sending…' : 'Email me a sign-in link'}
        </button>
      </form>
      {state === 'error' && <p role="alert">{error}</p>}
    </main>
  );
}

export default LoginPage;
