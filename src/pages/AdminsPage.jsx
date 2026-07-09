import { useState } from 'react';
import PropTypes from 'prop-types';
import { fetchAdmins, createAdmin, setAdminActive } from '../api';
import { useFetch } from '../useFetch';
import { useAction } from '../useAction';
import ConfirmButton from '../components/ConfirmButton';

function AddAdminForm({ onAdded }) {
  const [email, setEmail] = useState('');
  const [displayName, setDisplayName] = useState('');
  const { busy, error, run } = useAction();

  async function handleSubmit(event) {
    event.preventDefault();
    const succeeded = await run(
      () =>
        createAdmin({ email: email.trim(), displayName: displayName.trim() }),
      onAdded
    );
    if (succeeded) {
      setEmail('');
      setDisplayName('');
    }
  }

  return (
    <form className="inline-form" onSubmit={handleSubmit}>
      <label>
        Email
        <input
          type="email"
          required
          maxLength={255}
          value={email}
          placeholder="volunteer@example.com"
          onChange={(event) => setEmail(event.target.value)}
        />
      </label>
      <label>
        Display name
        <input
          required
          maxLength={255}
          value={displayName}
          placeholder="e.g. Poppy"
          onChange={(event) => setDisplayName(event.target.value)}
        />
      </label>
      <button type="submit" disabled={busy}>
        {busy ? 'Adding…' : 'Add admin'}
      </button>
      {error && <p role="alert">{error}</p>}
    </form>
  );
}

AddAdminForm.propTypes = {
  onAdded: PropTypes.func.isRequired,
};

/**
 * The admin allowlist (Phase 3E, staff handover): add a colleague, or remove
 * one who has left. Removal is a soft deactivation — a removed admin can't sign
 * in, but their name stays on past audit entries and can be reactivated. The
 * server refuses to let you remove your own access, so the current admin's row
 * shows "(you)" instead of a Remove button.
 */
function AdminsPage({ currentUser }) {
  const { loading, error, data, reload } = useFetch(fetchAdmins);
  const { error: actionError, run } = useAction();

  async function setActive(id, isActive) {
    await run(() => setAdminActive(id, isActive), reload);
  }

  if (loading && !data) return <p>Loading…</p>;
  if (error) return <p role="alert">{error}</p>;

  const admins = data.admins;

  return (
    <>
      <h2>Admins</h2>
      <p className="hint">
        Anyone on this list can sign in and manage the dashboard. Add a
        colleague by email — they receive a sign-in link the first time they
        request one. Removing an admin blocks them immediately but keeps their
        name on past changes; you can reactivate them later.
      </p>

      <table>
        <thead>
          <tr>
            <th>Name</th>
            <th>Email</th>
            <th>Status</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {admins.map((admin) => {
            const isSelf = admin.email === currentUser.email;
            return (
              <tr
                key={admin.id}
                className={admin.isActive ? undefined : 'retired'}
              >
                <td>
                  {admin.displayName}
                  {isSelf && <span className="badge">you</span>}
                </td>
                <td>{admin.email}</td>
                <td>
                  {admin.isActive ? (
                    'Active'
                  ) : (
                    <span className="badge badge-warn">Removed</span>
                  )}
                </td>
                <td className="actions">
                  {isSelf ? (
                    <span className="muted">—</span>
                  ) : admin.isActive ? (
                    <ConfirmButton
                      label="Remove"
                      question={`Remove ${admin.displayName}'s access?`}
                      onConfirm={() => setActive(admin.id, false)}
                    />
                  ) : (
                    <button
                      type="button"
                      onClick={() => setActive(admin.id, true)}
                    >
                      Reactivate
                    </button>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      {actionError && <p role="alert">{actionError}</p>}

      <details>
        <summary>Add an admin</summary>
        <AddAdminForm onAdded={reload} />
      </details>
    </>
  );
}

AdminsPage.propTypes = {
  currentUser: PropTypes.shape({
    email: PropTypes.string.isRequired,
  }).isRequired,
};

export default AdminsPage;
