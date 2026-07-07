import { Fragment, useState } from 'react';
import PropTypes from 'prop-types';
import {
  createBehavior,
  createBehaviorGroup,
  updateBehavior,
  deleteBehavior,
} from '../api';
import { useAction } from '../useAction';
import { BEHAVIOR_FLAG_FIELDS } from '../constants';

const FLAG_SUMMARY_LABELS = {
  requiresLocation: 'location',
  requiresObject: 'object',
  requiresObjectInteraction: 'object interaction',
  requiresAnimal: 'animal',
  requiresAnimalInteraction: 'animal interaction',
  requiresDescription: 'description',
};

const behaviorShape = PropTypes.shape({
  value: PropTypes.string.isRequired,
  label: PropTypes.string.isRequired,
  group: PropTypes.string.isRequired,
  excelRowLabel: PropTypes.string.isRequired,
  excelRowOrder: PropTypes.number.isRequired,
  retired: PropTypes.bool.isRequired,
});

const groupShape = PropTypes.shape({
  name: PropTypes.string.isRequired,
  sortOrder: PropTypes.number.isRequired,
});

function flagSummary(behavior) {
  const flags = Object.entries(FLAG_SUMMARY_LABELS)
    .filter(([key]) => behavior[key])
    .map(([, label]) => label);
  return flags.length ? flags.join(', ') : '—';
}

function emptyFlags() {
  return Object.fromEntries(BEHAVIOR_FLAG_FIELDS.map(([key]) => [key, false]));
}

function FlagCheckboxes({ flags, onToggle }) {
  return (
    <div className="checkgrid">
      {BEHAVIOR_FLAG_FIELDS.map(([key, label]) => (
        <label key={key}>
          <input
            type="checkbox"
            checked={flags[key]}
            onChange={() => onToggle(key)}
          />
          {label}
        </label>
      ))}
    </div>
  );
}

FlagCheckboxes.propTypes = {
  flags: PropTypes.object.isRequired,
  onToggle: PropTypes.func.isRequired,
};

function GroupSelect({ groups, value, onChange, label }) {
  return (
    <label>
      {label}
      <select value={value} onChange={onChange}>
        {groups.map((group) => (
          <option key={group.name} value={group.name}>
            {group.name}
          </option>
        ))}
      </select>
    </label>
  );
}

GroupSelect.propTypes = {
  groups: PropTypes.arrayOf(groupShape).isRequired,
  value: PropTypes.string.isRequired,
  onChange: PropTypes.func.isRequired,
  label: PropTypes.string.isRequired,
};

function EditBehaviorForm({ behavior, groups, onDone, onCancel }) {
  const [form, setForm] = useState({
    label: behavior.label,
    group: behavior.group,
    excelRowLabel: behavior.excelRowLabel,
    ...Object.fromEntries(
      BEHAVIOR_FLAG_FIELDS.map(([key]) => [key, behavior[key]])
    ),
  });
  const { busy, error, run } = useAction();

  async function handleSubmit(event) {
    event.preventDefault();
    await run(() => updateBehavior(behavior.value, form), onDone);
  }

  return (
    <form className="inline-form" onSubmit={handleSubmit}>
      <label>
        Label
        <input
          required
          maxLength={255}
          value={form.label}
          onChange={(event) =>
            setForm((previous) => ({ ...previous, label: event.target.value }))
          }
        />
      </label>
      <GroupSelect
        groups={groups}
        value={form.group}
        label="Group"
        onChange={(event) =>
          setForm((previous) => ({ ...previous, group: event.target.value }))
        }
      />
      <label>
        Excel row label
        <input
          required
          maxLength={255}
          value={form.excelRowLabel}
          onChange={(event) =>
            setForm((previous) => ({
              ...previous,
              excelRowLabel: event.target.value,
            }))
          }
        />
      </label>
      <FlagCheckboxes
        flags={form}
        onToggle={(key) =>
          setForm((previous) => ({ ...previous, [key]: !previous[key] }))
        }
      />
      <button type="submit" disabled={busy}>
        {busy ? 'Saving…' : 'Save behavior'}
      </button>
      <button type="button" onClick={onCancel}>
        Cancel
      </button>
      {error && <p role="alert">{error}</p>}
    </form>
  );
}

EditBehaviorForm.propTypes = {
  behavior: behaviorShape.isRequired,
  groups: PropTypes.arrayOf(groupShape).isRequired,
  onDone: PropTypes.func.isRequired,
  onCancel: PropTypes.func.isRequired,
};

function AddBehaviorForm({ groups, behaviors, onDone }) {
  const empty = {
    value: '',
    label: '',
    group: groups[0]?.name ?? '',
    excelRowLabel: '',
    insertAfter: '',
    ...emptyFlags(),
  };
  const [form, setForm] = useState(empty);
  const { busy, error, run } = useAction();

  const set = (field) => (event) =>
    setForm((previous) => ({ ...previous, [field]: event.target.value }));

  async function handleSubmit(event) {
    event.preventDefault();
    const { insertAfter, ...body } = form;
    const succeeded = await run(
      () => createBehavior(insertAfter ? { ...body, insertAfter } : body),
      onDone
    );
    if (succeeded) setForm(empty);
  }

  const byRowOrder = [...behaviors].sort(
    (a, b) => a.excelRowOrder - b.excelRowOrder
  );

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
      <GroupSelect
        groups={groups}
        value={form.group}
        label="Group"
        onChange={set('group')}
      />
      <label>
        Excel row label
        <input
          required
          maxLength={255}
          value={form.excelRowLabel}
          onChange={set('excelRowLabel')}
        />
      </label>
      <label>
        Excel row position
        <select value={form.insertAfter} onChange={set('insertAfter')}>
          <option value="">At the end</option>
          {byRowOrder.map((behavior) => (
            <option key={behavior.value} value={behavior.value}>
              After “{behavior.excelRowLabel}”
            </option>
          ))}
        </select>
      </label>
      <FlagCheckboxes
        flags={form}
        onToggle={(key) =>
          setForm((previous) => ({ ...previous, [key]: !previous[key] }))
        }
      />
      <button type="submit" disabled={busy}>
        {busy ? 'Adding…' : 'Add behavior'}
      </button>
      {error && <p role="alert">{error}</p>}
    </form>
  );
}

AddBehaviorForm.propTypes = {
  groups: PropTypes.arrayOf(groupShape).isRequired,
  behaviors: PropTypes.arrayOf(behaviorShape).isRequired,
  onDone: PropTypes.func.isRequired,
};

function AddGroupForm({ groups, onDone }) {
  const nextOrder =
    groups.reduce((max, group) => Math.max(max, group.sortOrder), 0) + 1;
  const [name, setName] = useState('');
  const [sortOrder, setSortOrder] = useState(nextOrder);
  const { busy, error, run } = useAction();

  async function handleSubmit(event) {
    event.preventDefault();
    const succeeded = await run(
      () => createBehaviorGroup({ name, sortOrder: Number(sortOrder) }),
      onDone
    );
    if (succeeded) setName('');
  }

  return (
    <form className="inline-form" onSubmit={handleSubmit}>
      <label>
        Group name
        <input
          required
          maxLength={100}
          value={name}
          onChange={(event) => setName(event.target.value)}
        />
      </label>
      <label>
        Sort order
        <input
          type="number"
          required
          value={sortOrder}
          onChange={(event) => setSortOrder(event.target.value)}
        />
      </label>
      <button type="submit" disabled={busy}>
        {busy ? 'Adding…' : 'Add group'}
      </button>
      {error && <p role="alert">{error}</p>}
    </form>
  );
}

AddGroupForm.propTypes = {
  groups: PropTypes.arrayOf(groupShape).isRequired,
  onDone: PropTypes.func.isRequired,
};

/**
 * The behavior catalog: grouped tables with the per-aviary enablement matrix
 * (read-only here — each aviary's page edits its own enabled set), inline
 * behavior editing, retire/unretire, and removal of never-published drafts.
 * A behavior's value is its wire identity — there is no rename; label fixes
 * are for typos, semantic changes get a new behavior (Phase 1 §3.1).
 */
function BehaviorCatalog({
  groups,
  behaviors,
  aviarySlugs,
  enablement,
  onChanged,
}) {
  const [editing, setEditing] = useState(null); // behavior value being edited
  const { error: actionError, run: runAction } = useAction();

  function handleDone() {
    setEditing(null);
    onChanged();
  }

  async function handleRetire(behavior) {
    await runAction(
      () => updateBehavior(behavior.value, { retired: !behavior.retired }),
      onChanged
    );
  }

  async function handleRemove(behavior) {
    if (
      !window.confirm(
        `Remove draft behavior "${behavior.label}"? Behaviors already in a published config can't be removed — retire them instead.`
      )
    ) {
      return;
    }
    await runAction(() => deleteBehavior(behavior.value), onChanged);
  }

  const columnCount = 5 + aviarySlugs.length;

  return (
    <>
      {actionError && <p role="alert">{actionError}</p>}
      {groups.map((group) => {
        const rows = behaviors.filter((b) => b.group === group.name);
        if (!rows.length) return null;
        return (
          <section key={group.name}>
            <h3>{group.name}</h3>
            <table>
              <thead>
                <tr>
                  <th>Label</th>
                  <th>Value</th>
                  <th>Requires</th>
                  <th>Excel row</th>
                  {aviarySlugs.map((slug) => (
                    <th key={slug}>{slug}</th>
                  ))}
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((behavior) => (
                  <Fragment key={behavior.value}>
                    <tr className={behavior.retired ? 'retired' : undefined}>
                      <td>
                        {behavior.label}
                        {behavior.retired && (
                          <span className="badge badge-warn">Retired</span>
                        )}
                      </td>
                      <td>{behavior.value}</td>
                      <td>{flagSummary(behavior)}</td>
                      <td>{behavior.excelRowLabel}</td>
                      {aviarySlugs.map((slug) => (
                        <td key={slug}>
                          {enablement[slug].behaviors.includes(behavior.value)
                            ? '✓'
                            : ''}
                        </td>
                      ))}
                      <td className="actions">
                        <button
                          type="button"
                          onClick={() => setEditing(behavior.value)}
                        >
                          Edit…
                        </button>
                        <button
                          type="button"
                          onClick={() => handleRetire(behavior)}
                        >
                          {behavior.retired ? 'Unretire' : 'Retire'}
                        </button>
                        <button
                          type="button"
                          onClick={() => handleRemove(behavior)}
                        >
                          Remove
                        </button>
                      </td>
                    </tr>
                    {editing === behavior.value && (
                      <tr className="editor-row">
                        <td colSpan={columnCount}>
                          <EditBehaviorForm
                            behavior={behavior}
                            groups={groups}
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
          </section>
        );
      })}
      <details>
        <summary>Add a behavior</summary>
        <AddBehaviorForm
          groups={groups}
          behaviors={behaviors}
          onDone={onChanged}
        />
      </details>
      <details>
        <summary>Add a behavior group</summary>
        <AddGroupForm groups={groups} onDone={onChanged} />
      </details>
    </>
  );
}

BehaviorCatalog.propTypes = {
  groups: PropTypes.arrayOf(groupShape).isRequired,
  behaviors: PropTypes.arrayOf(behaviorShape).isRequired,
  aviarySlugs: PropTypes.arrayOf(PropTypes.string).isRequired,
  enablement: PropTypes.object.isRequired,
  onChanged: PropTypes.func.isRequired,
};

export default BehaviorCatalog;
