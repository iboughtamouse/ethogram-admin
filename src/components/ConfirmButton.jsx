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
function ConfirmButton({ label, question, onConfirm }) {
  const [armed, setArmed] = useState(false);

  if (!armed) {
    return (
      <button type="button" onClick={() => setArmed(true)}>
        {label}
      </button>
    );
  }

  return (
    <span className="confirm-arm">
      {question}
      <button
        type="button"
        className="danger"
        // Focus moves here when the idle button is replaced, keeping keyboard
        // flow intact (Escape-like bailout is the Cancel button beside it)
        autoFocus
        onClick={() => {
          setArmed(false);
          onConfirm();
        }}
      >
        Confirm
      </button>
      <button type="button" onClick={() => setArmed(false)}>
        Cancel
      </button>
    </span>
  );
}

ConfirmButton.propTypes = {
  label: PropTypes.string.isRequired,
  question: PropTypes.string.isRequired,
  onConfirm: PropTypes.func.isRequired,
};

export default ConfirmButton;
