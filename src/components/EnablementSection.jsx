import { useEffect, useState } from 'react';
import PropTypes from 'prop-types';
import { fetchVocabulary, setEnablement } from '../api';
import { useFetch } from '../useFetch';
import { useAction } from '../useAction';
import { OPTION_KIND_LABELS } from '../constants';

const ENABLEMENT_KEYS = [
  'behaviors',
  'object',
  'object_interaction',
  'animal',
  'animal_interaction',
];

function toSets(enabled) {
  return Object.fromEntries(
    ENABLEMENT_KEYS.map((key) => [key, new Set(enabled[key])])
  );
}

function sameSets(a, b) {
  return ENABLEMENT_KEYS.every(
    (key) =>
      a[key].size === b[key].size && [...a[key]].every((v) => b[key].has(v))
  );
}

function CheckGrid({ entries, checked, onToggle }) {
  return (
    <div className="checkgrid">
      {entries.map((entry) => (
        <label key={entry.value}>
          <input
            type="checkbox"
            checked={checked.has(entry.value)}
            onChange={() => onToggle(entry.value)}
          />
          {entry.label}
          {entry.retired && <span className="badge badge-warn">Retired</span>}
        </label>
      ))}
    </div>
  );
}

CheckGrid.propTypes = {
  entries: PropTypes.arrayOf(
    PropTypes.shape({
      value: PropTypes.string.isRequired,
      label: PropTypes.string.isRequired,
      retired: PropTypes.bool,
    })
  ).isRequired,
  checked: PropTypes.instanceOf(Set).isRequired,
  onToggle: PropTypes.func.isRequired,
};

/**
 * Which catalog entries this aviary's form offers (the enablement junctions).
 * The whole set is replaced on save (PUT), matching the API's replace-set
 * endpoint. Disabling never blanks history: resolution uses the catalog plus
 * the observation's stamped version, and the form keeps draft-held values
 * listed (Phase 1 §4 keep-listed rule).
 */
function EnablementSection({ slug, enabled, onChanged }) {
  const catalog = useFetch(fetchVocabulary);
  const [draft, setDraft] = useState(() => toSets(enabled));
  const { busy, error: saveError, run } = useAction();

  // Resync after a reload (e.g. our own successful save)
  useEffect(() => {
    setDraft(toSets(enabled));
  }, [enabled]);

  const dirty = !sameSets(draft, toSets(enabled));

  function toggle(key, value) {
    setDraft((previous) => {
      const next = { ...previous, [key]: new Set(previous[key]) };
      if (next[key].has(value)) {
        next[key].delete(value);
      } else {
        next[key].add(value);
      }
      return next;
    });
  }

  async function handleSave() {
    await run(
      () =>
        setEnablement(
          slug,
          Object.fromEntries(
            ENABLEMENT_KEYS.map((key) => [key, [...draft[key]]])
          )
        ),
      onChanged
    );
  }

  return (
    <>
      <h3>Enabled vocabulary</h3>
      <p>{enabled.behaviors.length} behaviors enabled.</p>
      <ul>
        {Object.entries(OPTION_KIND_LABELS).map(([kind, label]) => (
          <li key={kind}>
            {label}: {enabled[kind].length}
          </li>
        ))}
      </ul>

      <details>
        <summary>Edit enabled vocabulary</summary>
        {catalog.loading && <p>Loading…</p>}
        {catalog.error && <p role="alert">{catalog.error}</p>}
        {catalog.data && (
          <>
            <h4>Behaviors</h4>
            {catalog.data.behaviorGroups.map((group) => {
              const rows = catalog.data.behaviors.filter(
                (b) => b.group === group.name
              );
              if (!rows.length) return null;
              return (
                <section key={group.name}>
                  <h5>{group.name}</h5>
                  <CheckGrid
                    entries={rows}
                    checked={draft.behaviors}
                    onToggle={(value) => toggle('behaviors', value)}
                  />
                </section>
              );
            })}
            {Object.entries(OPTION_KIND_LABELS).map(([kind, label]) => (
              <section key={kind}>
                <h4>{label}</h4>
                <CheckGrid
                  entries={catalog.data.options[kind]}
                  checked={draft[kind]}
                  onToggle={(value) => toggle(kind, value)}
                />
              </section>
            ))}
            <button
              type="button"
              disabled={!dirty || busy}
              onClick={handleSave}
            >
              {busy ? 'Saving…' : 'Save enabled vocabulary'}
            </button>
            {saveError && <p role="alert">{saveError}</p>}
          </>
        )}
      </details>
    </>
  );
}

EnablementSection.propTypes = {
  slug: PropTypes.string.isRequired,
  enabled: PropTypes.shape({
    behaviors: PropTypes.arrayOf(PropTypes.string).isRequired,
    object: PropTypes.arrayOf(PropTypes.string).isRequired,
    object_interaction: PropTypes.arrayOf(PropTypes.string).isRequired,
    animal: PropTypes.arrayOf(PropTypes.string).isRequired,
    animal_interaction: PropTypes.arrayOf(PropTypes.string).isRequired,
  }).isRequired,
  onChanged: PropTypes.func.isRequired,
};

export default EnablementSection;
