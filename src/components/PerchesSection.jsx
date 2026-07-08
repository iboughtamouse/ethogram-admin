import { Fragment, useState } from 'react';
import PropTypes from 'prop-types';
import { createPerch, updatePerch, deletePerch } from '../api';
import { useAction } from '../useAction';
import ConfirmButton from './ConfirmButton';

const perchShape = PropTypes.shape({
  value: PropTypes.string.isRequired,
  label: PropTypes.string.isRequired,
  group: PropTypes.string,
  retired: PropTypes.bool.isRequired,
});

function EditPerchForm({ slug, perch, onDone, onCancel }) {
  const [label, setLabel] = useState(perch.label);
  const [group, setGroup] = useState(perch.group ?? '');
  const { busy, error, run } = useAction();

  async function handleSubmit(event) {
    event.preventDefault();
    await run(
      () =>
        updatePerch(slug, perch.value, {
          label,
          group: group.trim() ? group.trim() : null,
        }),
      onDone
    );
  }

  return (
    <form className="inline-form" onSubmit={handleSubmit}>
      <label>
        Label
        <input
          required
          maxLength={255}
          value={label}
          onChange={(event) => setLabel(event.target.value)}
        />
      </label>
      <label>
        Group
        <input
          maxLength={100}
          value={group}
          placeholder="(none)"
          onChange={(event) => setGroup(event.target.value)}
        />
      </label>
      <button type="submit" disabled={busy}>
        {busy ? 'Saving…' : 'Save perch'}
      </button>
      <button type="button" onClick={onCancel}>
        Cancel
      </button>
      {error && <p role="alert">{error}</p>}
    </form>
  );
}

EditPerchForm.propTypes = {
  slug: PropTypes.string.isRequired,
  perch: perchShape.isRequired,
  onDone: PropTypes.func.isRequired,
  onCancel: PropTypes.func.isRequired,
};

const EMPTY_PERCH = { value: '', label: '', group: '' };

function AddPerchForm({ slug, onDone }) {
  const [form, setForm] = useState(EMPTY_PERCH);
  const { busy, error, run } = useAction();

  const set = (field) => (event) =>
    setForm((previous) => ({ ...previous, [field]: event.target.value }));

  async function handleSubmit(event) {
    event.preventDefault();
    const succeeded = await run(
      () =>
        createPerch(slug, {
          value: form.value,
          label: form.label,
          group: form.group.trim() ? form.group.trim() : null,
        }),
      onDone
    );
    if (succeeded) setForm(EMPTY_PERCH);
  }

  return (
    <form className="inline-form" onSubmit={handleSubmit}>
      <label>
        Value
        <input
          required
          maxLength={20}
          value={form.value}
          onChange={set('value')}
        />
      </label>
      <label>
        Label
        <input
          required
          maxLength={255}
          value={form.label}
          onChange={set('label')}
        />
      </label>
      <label>
        Group
        <input
          maxLength={100}
          value={form.group}
          placeholder="(none)"
          onChange={set('group')}
        />
      </label>
      <button type="submit" disabled={busy}>
        {busy ? 'Adding…' : 'Add perch'}
      </button>
      {error && <p role="alert">{error}</p>}
    </form>
  );
}

AddPerchForm.propTypes = {
  slug: PropTypes.string.isRequired,
  onDone: PropTypes.func.isRequired,
};

/**
 * Perch editor for one aviary: add, edit label/group, retire/unretire, and
 * remove. A perch's value is its wire identity and immutable once created
 * (no rename exists server-side); removal is refused for perches in any
 * published version — retire those instead.
 */
function PerchesSection({ slug, perches, onChanged }) {
  const [editing, setEditing] = useState(null); // perch value being edited
  const { error: actionError, run: runAction } = useAction();

  function handleDone() {
    setEditing(null);
    onChanged();
  }

  async function handleRetire(perch) {
    await runAction(
      () => updatePerch(slug, perch.value, { retired: !perch.retired }),
      onChanged
    );
  }

  // The published-perch case doesn't need pre-warning here: the API refuses
  // it with a friendly "retire it instead" message the section displays
  async function handleRemove(perch) {
    await runAction(() => deletePerch(slug, perch.value), onChanged);
  }

  return (
    <>
      <h3>Perches ({perches.length})</h3>
      {actionError && <p role="alert">{actionError}</p>}
      <table>
        <thead>
          <tr>
            <th>Value</th>
            <th>Label</th>
            <th>Group</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {perches.map((perch) => (
            <Fragment key={perch.value}>
              <tr className={perch.retired ? 'retired' : undefined}>
                <td>{perch.value}</td>
                <td>
                  {perch.label}
                  {perch.retired && (
                    <span className="badge badge-warn">Retired</span>
                  )}
                </td>
                <td>{perch.group ?? '—'}</td>
                <td className="actions">
                  <button type="button" onClick={() => setEditing(perch.value)}>
                    Edit…
                  </button>
                  <button type="button" onClick={() => handleRetire(perch)}>
                    {perch.retired ? 'Unretire' : 'Retire'}
                  </button>
                  <ConfirmButton
                    label="Remove"
                    question={`Remove perch "${perch.value}"?`}
                    onConfirm={() => handleRemove(perch)}
                  />
                </td>
              </tr>
              {editing === perch.value && (
                <tr className="editor-row">
                  <td colSpan={4}>
                    <EditPerchForm
                      slug={slug}
                      perch={perch}
                      onDone={handleDone}
                      onCancel={() => setEditing(null)}
                    />
                  </td>
                </tr>
              )}
            </Fragment>
          ))}
        </tbody>
      </table>
      <details>
        <summary>Add a perch</summary>
        <AddPerchForm slug={slug} onDone={onChanged} />
      </details>
    </>
  );
}

PerchesSection.propTypes = {
  slug: PropTypes.string.isRequired,
  perches: PropTypes.arrayOf(perchShape).isRequired,
  onChanged: PropTypes.func.isRequired,
};

export default PerchesSection;
