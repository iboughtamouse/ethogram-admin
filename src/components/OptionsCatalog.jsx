import { Fragment, useState } from 'react';
import PropTypes from 'prop-types';
import { createOption, updateOption, deleteOption } from '../api';
import { useAction } from '../useAction';
import { OPTION_KIND_LABELS } from '../constants';

const optionShape = PropTypes.shape({
  value: PropTypes.string.isRequired,
  label: PropTypes.string.isRequired,
  retired: PropTypes.bool.isRequired,
});

function EditOptionForm({ kind, option, onDone, onCancel }) {
  const [label, setLabel] = useState(option.label);
  const { busy, error, run } = useAction();

  async function handleSubmit(event) {
    event.preventDefault();
    await run(() => updateOption(kind, option.value, { label }), onDone);
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
      <button type="submit" disabled={busy}>
        {busy ? 'Saving…' : 'Save option'}
      </button>
      <button type="button" onClick={onCancel}>
        Cancel
      </button>
      {error && <p role="alert">{error}</p>}
    </form>
  );
}

EditOptionForm.propTypes = {
  kind: PropTypes.string.isRequired,
  option: optionShape.isRequired,
  onDone: PropTypes.func.isRequired,
  onCancel: PropTypes.func.isRequired,
};

const EMPTY_OPTION = { value: '', label: '' };

function AddOptionForm({ kind, onDone }) {
  const [form, setForm] = useState(EMPTY_OPTION);
  const { busy, error, run } = useAction();

  const set = (field) => (event) =>
    setForm((previous) => ({ ...previous, [field]: event.target.value }));

  async function handleSubmit(event) {
    event.preventDefault();
    const succeeded = await run(
      () => createOption({ kind, value: form.value, label: form.label }),
      onDone
    );
    if (succeeded) setForm(EMPTY_OPTION);
  }

  return (
    <form className="inline-form" onSubmit={handleSubmit}>
      <label>
        Value
        <input
          required
          maxLength={100}
          pattern="[a-z0-9][a-z0-9_-]*"
          title="lowercase letters, digits, underscores, hyphens"
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
      <button type="submit" disabled={busy}>
        {busy ? 'Adding…' : 'Add option'}
      </button>
      {error && <p role="alert">{error}</p>}
    </form>
  );
}

AddOptionForm.propTypes = {
  kind: PropTypes.string.isRequired,
  onDone: PropTypes.func.isRequired,
};

/**
 * The four option catalogs (objects, object interactions, animals, animal
 * interactions) with the per-aviary enablement matrix (read-only here),
 * inline label editing, retire/unretire, and removal of never-published
 * drafts. Values are wire identities — label fixes only, no renames.
 */
function OptionsCatalog({ options, aviarySlugs, enablement, onChanged }) {
  const [editing, setEditing] = useState(null); // `${kind}/${value}`
  const { error: actionError, run: runAction } = useAction();

  function handleDone() {
    setEditing(null);
    onChanged();
  }

  async function handleRetire(kind, option) {
    await runAction(
      () => updateOption(kind, option.value, { retired: !option.retired }),
      onChanged
    );
  }

  async function handleRemove(kind, option) {
    if (
      !window.confirm(
        `Remove draft option "${option.label}"? Options already in a published config can't be removed — retire them instead.`
      )
    ) {
      return;
    }
    await runAction(() => deleteOption(kind, option.value), onChanged);
  }

  return (
    <>
      {actionError && <p role="alert">{actionError}</p>}
      {Object.entries(OPTION_KIND_LABELS).map(([kind, kindLabel]) => (
        <section key={kind}>
          <h3>{kindLabel}</h3>
          <table>
            <thead>
              <tr>
                <th>Label</th>
                <th>Value</th>
                {aviarySlugs.map((slug) => (
                  <th key={slug}>{slug}</th>
                ))}
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {options[kind].map((option) => (
                <Fragment key={option.value}>
                  <tr className={option.retired ? 'retired' : undefined}>
                    <td>
                      {option.label}
                      {option.retired && (
                        <span className="badge badge-warn">Retired</span>
                      )}
                    </td>
                    <td>{option.value}</td>
                    {aviarySlugs.map((slug) => (
                      <td key={slug}>
                        {enablement[slug][kind].includes(option.value)
                          ? '✓'
                          : ''}
                      </td>
                    ))}
                    <td className="actions">
                      <button
                        type="button"
                        onClick={() => setEditing(`${kind}/${option.value}`)}
                      >
                        Edit…
                      </button>
                      <button
                        type="button"
                        onClick={() => handleRetire(kind, option)}
                      >
                        {option.retired ? 'Unretire' : 'Retire'}
                      </button>
                      <button
                        type="button"
                        onClick={() => handleRemove(kind, option)}
                      >
                        Remove
                      </button>
                    </td>
                  </tr>
                  {editing === `${kind}/${option.value}` && (
                    <tr className="editor-row">
                      <td colSpan={3 + aviarySlugs.length}>
                        <EditOptionForm
                          kind={kind}
                          option={option}
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
            <summary>Add {kindLabel.toLowerCase().replace(/s$/, '')}</summary>
            <AddOptionForm kind={kind} onDone={onChanged} />
          </details>
        </section>
      ))}
    </>
  );
}

OptionsCatalog.propTypes = {
  options: PropTypes.objectOf(PropTypes.arrayOf(optionShape)).isRequired,
  aviarySlugs: PropTypes.arrayOf(PropTypes.string).isRequired,
  enablement: PropTypes.object.isRequired,
  onChanged: PropTypes.func.isRequired,
};

export default OptionsCatalog;
