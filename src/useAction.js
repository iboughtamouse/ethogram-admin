import { useCallback, useState } from 'react';

/**
 * Wraps a mutation call: tracks busy/error state, surfaces the API's friendly
 * error message, and runs onSuccess (usually the page's reload()) on 2xx.
 * Returns true when the call succeeded so submit handlers can reset forms.
 */
export function useAction() {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const run = useCallback(async (call, onSuccess) => {
    setBusy(true);
    setError('');
    const { ok, payload } = await call();
    setBusy(false);
    if (ok) {
      onSuccess?.(payload?.data);
      return true;
    }
    setError(payload?.error || 'Something went wrong. Please try again.');
    return false;
  }, []);

  return { busy, error, run };
}
