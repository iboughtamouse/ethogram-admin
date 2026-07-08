import { Fragment, useState } from 'react';
import PropTypes from 'prop-types';
import {
  createSubject,
  updateSubject,
  changeSubjectType,
  deleteSubject,
} from '../api';
import { useAction } from '../useAction';
import { SUBJECT_TYPES, SUBJECT_TYPE_LABELS } from '../constants';

const subjectShape = PropTypes.shape({
  id: PropTypes.string.isRequired,
  name: PropTypes.string.isRequired,
  species: PropTypes.string.isRequired,
  type: PropTypes.oneOf(SUBJECT_TYPES).isRequired,
  arrivedOn: PropTypes.string.isRequired,
  departedOn: PropTypes.string,
  current: PropTypes.bool.isRequired,
});

function DepartureForm({ subject, onDone, onCancel }) {
  const [departedOn, setDepartedOn] = useState('');
  const { busy, error, run } = useAction();

  async function handleSubmit(event) {
    event.preventDefault();
    await run(() => updateSubject(subject.id, { departedOn }), onDone);
  }

  return (
    <form className="inline-form" onSubmit={handleSubmit}>
      <label>
        Departure date
        <input
          type="date"
          required
          value={departedOn}
          onChange={(event) => setDepartedOn(event.target.value)}
        />
      </label>
      <button type="submit" disabled={busy}>
        {busy ? 'Saving…' : 'Record departure'}
      </button>
      <button type="button" onClick={onCancel}>
        Cancel
      </button>
      {error && <p role="alert">{error}</p>}
    </form>
  );
}

DepartureForm.propTypes = {
  subject: subjectShape.isRequired,
  onDone: PropTypes.func.isRequired,
  onCancel: PropTypes.func.isRequired,
};

function ChangeTypeForm({ subject, onDone, onCancel }) {
  const otherTypes = SUBJECT_TYPES.filter((type) => type !== subject.type);
  const [newType, setNewType] = useState(otherTypes[0]);
  const [effectiveOn, setEffectiveOn] = useState('');
  const { busy, error, run } = useAction();

  async function handleSubmit(event) {
    event.preventDefault();
    await run(
      () => changeSubjectType(subject.id, { newType, effectiveOn }),
      onDone
    );
  }

  return (
    <form className="inline-form" onSubmit={handleSubmit}>
      <label>
        New type
        <select
          value={newType}
          onChange={(event) => setNewType(event.target.value)}
        >
          {otherTypes.map((type) => (
            <option key={type} value={type}>
              {SUBJECT_TYPE_LABELS[type]}
            </option>
          ))}
        </select>
      </label>
      <label>
        Effective date
        <input
          type="date"
          required
          value={effectiveOn}
          onChange={(event) => setEffectiveOn(event.target.value)}
        />
      </label>
      <button type="submit" disabled={busy}>
        {busy ? 'Saving…' : 'Change type'}
      </button>
      <button type="button" onClick={onCancel}>
        Cancel
      </button>
      {error && <p role="alert">{error}</p>}
    </form>
  );
}

ChangeTypeForm.propTypes = {
  subject: subjectShape.isRequired,
  onDone: PropTypes.func.isRequired,
  onCancel: PropTypes.func.isRequired,
};

const EMPTY_SUBJECT = {
  name: '',
  species: '',
  type: 'juvenile',
  arrivedOn: '',
};

function AddSubjectForm({ slug, onDone }) {
  const [form, setForm] = useState(EMPTY_SUBJECT);
  const { busy, error, run } = useAction();

  const set = (field) => (event) =>
    setForm((previous) => ({ ...previous, [field]: event.target.value }));

  async function handleSubmit(event) {
    event.preventDefault();
    const succeeded = await run(() => createSubject(slug, form), onDone);
    if (succeeded) setForm(EMPTY_SUBJECT);
  }

  return (
    <form className="inline-form" onSubmit={handleSubmit}>
      <label>
        Name
        <input
          required
          maxLength={255}
          value={form.name}
          onChange={set('name')}
        />
      </label>
      <label>
        Species
        <input
          required
          maxLength={255}
          value={form.species}
          onChange={set('species')}
        />
      </label>
      <label>
        Type
        <select value={form.type} onChange={set('type')}>
          {SUBJECT_TYPES.map((type) => (
            <option key={type} value={type}>
              {SUBJECT_TYPE_LABELS[type]}
            </option>
          ))}
        </select>
      </label>
      <label>
        Arrival date
        <input
          type="date"
          required
          value={form.arrivedOn}
          onChange={set('arrivedOn')}
        />
      </label>
      <button type="submit" disabled={busy}>
        {busy ? 'Adding…' : 'Add subject'}
      </button>
      {error && <p role="alert">{error}</p>}
    </form>
  );
}

AddSubjectForm.propTypes = {
  slug: PropTypes.string.isRequired,
  onDone: PropTypes.func.isRequired,
};

/**
 * Subject residency episodes for one aviary: add, record a departure, change
 * type (close + reopen, Phase 1 §2.2), and remove. Removal is only possible
 * for episodes never captured in a published version — the API refuses
 * anything else with a friendly message shown above the table.
 */
function SubjectsSection({ slug, subjects, onChanged }) {
  // The one row-level editor open at a time: { id, kind: 'depart' | 'change-type' }
  const [action, setAction] = useState(null);
  const { error: removeError, run: runRemove } = useAction();

  function handleDone() {
    setAction(null);
    onChanged();
  }

  async function handleRemove(subject) {
    if (
      !window.confirm(
        `Remove the draft episode for "${subject.name}"? Episodes already in a published config can't be removed — record a departure instead.`
      )
    ) {
      return;
    }
    await runRemove(() => deleteSubject(subject.id), onChanged);
  }

  return (
    <>
      <h3>Subjects</h3>
      {removeError && <p role="alert">{removeError}</p>}
      <table>
        <thead>
          <tr>
            <th>Name</th>
            <th>Species</th>
            <th>Type</th>
            <th>Arrived</th>
            <th>Departed</th>
            <th>Status</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {subjects.map((subject) => (
            <Fragment key={subject.id}>
              <tr>
                <td>{subject.name}</td>
                <td>{subject.species}</td>
                <td>{SUBJECT_TYPE_LABELS[subject.type]}</td>
                <td>{subject.arrivedOn}</td>
                <td>{subject.departedOn ?? '—'}</td>
                <td>
                  {subject.current ? (
                    <span className="badge">Current</span>
                  ) : (
                    'Past'
                  )}
                </td>
                <td className="actions">
                  {subject.departedOn === null && (
                    <>
                      <button
                        type="button"
                        onClick={() =>
                          setAction({ id: subject.id, kind: 'depart' })
                        }
                      >
                        Departed…
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          setAction({ id: subject.id, kind: 'change-type' })
                        }
                      >
                        Change type…
                      </button>
                    </>
                  )}
                  <button type="button" onClick={() => handleRemove(subject)}>
                    Remove
                  </button>
                </td>
              </tr>
              {action?.id === subject.id && (
                <tr className="editor-row">
                  <td colSpan={7}>
                    {action.kind === 'depart' ? (
                      <DepartureForm
                        subject={subject}
                        onDone={handleDone}
                        onCancel={() => setAction(null)}
                      />
                    ) : (
                      <ChangeTypeForm
                        subject={subject}
                        onDone={handleDone}
                        onCancel={() => setAction(null)}
                      />
                    )}
                  </td>
                </tr>
              )}
            </Fragment>
          ))}
        </tbody>
      </table>
      <details>
        <summary>Add a subject</summary>
        <AddSubjectForm slug={slug} onDone={onChanged} />
      </details>
    </>
  );
}

SubjectsSection.propTypes = {
  slug: PropTypes.string.isRequired,
  subjects: PropTypes.arrayOf(subjectShape).isRequired,
  onChanged: PropTypes.func.isRequired,
};

export default SubjectsSection;
