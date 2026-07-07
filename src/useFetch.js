import { useEffect, useState } from 'react';

/**
 * Fetch-on-mount for the read-only dashboard pages. `fetcher` must be a
 * stable function (module-level api helper or a useCallback); it re-runs
 * whenever the fetcher identity changes (e.g. a new slug-bound callback).
 */
export function useFetch(fetcher) {
  const [state, setState] = useState({
    loading: true,
    error: null,
    data: null,
  });

  useEffect(() => {
    let cancelled = false;
    setState({ loading: true, error: null, data: null });
    fetcher().then(({ ok, status, payload }) => {
      if (cancelled) return;
      if (ok && payload?.data) {
        setState({ loading: false, error: null, data: payload.data });
      } else {
        setState({
          loading: false,
          error: payload?.error || `Request failed (${status})`,
          data: null,
        });
      }
    });
    return () => {
      cancelled = true;
    };
  }, [fetcher]);

  return state;
}
