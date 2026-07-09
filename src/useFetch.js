import { useCallback, useEffect, useState } from 'react';

/**
 * Fetch-on-mount for the dashboard pages. `fetcher` must be a stable function
 * (module-level api helper or a useCallback); it re-runs whenever the fetcher
 * identity changes (e.g. a new slug-bound callback) or `reload()` is called
 * (after a mutation).
 */
export function useFetch(fetcher) {
  const [state, setState] = useState({
    loading: true,
    error: null,
    data: null,
  });
  const [nonce, setNonce] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setState((previous) => ({ ...previous, loading: true, error: null }));
    fetcher().then(({ ok, status, payload }) => {
      if (cancelled) return;
      if (ok && payload?.data) {
        setState({ loading: false, error: null, data: payload.data });
      } else {
        setState({
          loading: false,
          // status 0 = the fetch itself failed (offline / server unreachable);
          // give staff a plain cause + recovery, not a bare number
          error:
            payload?.error ||
            (status === 0
              ? "Can't reach the server — check your internet connection and reload the page."
              : `Something went wrong loading this page (error ${status}). Try reloading.`),
          data: null,
        });
      }
    });
    return () => {
      cancelled = true;
    };
  }, [fetcher, nonce]);

  const reload = useCallback(() => setNonce((n) => n + 1), []);

  return { ...state, reload };
}
