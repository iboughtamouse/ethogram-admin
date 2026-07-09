import PropTypes from 'prop-types';
import { updateAviary } from '../api';
import { useAction } from '../useAction';

/**
 * Activate / deactivate an aviary. New aviaries start inactive (the API
 * creates them that way) so a half-built one can't ride a publish into the
 * observer form — the form only shows active aviaries. Activating is the
 * deliberate final step of the New Aviary flow; it still only reaches
 * observers once published.
 */
function ActivationControl({ slug, isActive, onChanged }) {
  const { busy, error, run } = useAction();

  function toggle() {
    run(() => updateAviary(slug, { isActive: !isActive }), onChanged);
  }

  return (
    <section className={`activation ${isActive ? '' : 'activation-inactive'}`}>
      {isActive ? (
        <p>
          <span className="badge">Active</span> Shown in the observer form once
          published.
          <button
            type="button"
            className="linkish"
            onClick={toggle}
            disabled={busy}
          >
            {busy ? 'Working…' : 'Deactivate'}
          </button>
        </p>
      ) : (
        <p>
          <span className="badge badge-warn">Inactive</span> Observers
          can&apos;t see this aviary. Finish setting it up (subjects, diagrams,
          perches, and vocabulary — in the order below), then activate and
          publish.
          <button type="button" onClick={toggle} disabled={busy}>
            {busy ? 'Activating…' : 'Activate'}
          </button>
        </p>
      )}
      {error && <p role="alert">{error}</p>}
    </section>
  );
}

ActivationControl.propTypes = {
  slug: PropTypes.string.isRequired,
  isActive: PropTypes.bool.isRequired,
  onChanged: PropTypes.func.isRequired,
};

export default ActivationControl;
