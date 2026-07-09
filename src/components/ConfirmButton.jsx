import { useState } from 'react';
import PropTypes from 'prop-types';

/**
 * In-app replacement for window.confirm on destructive actions (smoke-test
 * follow-up SM-1): the first click arms the control — the button is replaced
 * in place by a short question with Confirm/Cancel — and only Confirm runs
 * the action. Unlike a native dialog it is stylable, doesn't steal OS focus
 * or block the JS thread, reads consistently to keyboard and screen-reader
 * users, and is drivable by DOM test harnesses.
 */
function ConfirmButton({ label, question, onConfirm, disabled = false }) {
  const [armed, setArmed] = useState(false);

  if (!armed) {
    return (
      <button type="button" disabled={disabled} onClick={() => setArmed(true)}>
        {label}
      </button>
    );
  }

  return (
    <span className="confirm-arm" role="group" aria-label={question}>
      {question}
      <button
        type="button"
        className="danger"
        onClick={() => {
          setArmed(false);
          onConfirm();
        }}
      >
        Confirm
      </button>
      {/* Focus lands on Cancel, not the destructive Confirm: a stray second
          Enter (key-repeat while arming) then cancels rather than deletes.
          Confirm is one Tab away. */}
      <button type="button" autoFocus onClick={() => setArmed(false)}>
        Cancel
      </button>
    </span>
  );
}

ConfirmButton.propTypes = {
  label: PropTypes.string.isRequired,
  question: PropTypes.string.isRequired,
  onConfirm: PropTypes.func.isRequired,
  // Disables the trigger button (e.g. while a sibling action is in flight)
  disabled: PropTypes.bool,
};

export default ConfirmButton;
