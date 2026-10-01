import { useEffect, useRef, useState } from "react";

export interface AsyncState<T> {
  data: T | null;
  error: string | null;
  loading: boolean;
}

/**
 * Runs `fetcher` whenever `deps` change, tracking loading/error/data state
 * and ignoring results from a stale (superseded) request.
 */
export function useAsync<T>(fetcher: () => Promise<T>, deps: unknown[]): AsyncState<T> {
  const [state, setState] = useState<AsyncState<T>>({ data: null, error: null, loading: true });
  const requestId = useRef(0);

  useEffect(() => {
    const id = ++requestId.current;
    setState((prev) => ({ ...prev, loading: true, error: null }));

    fetcher()
      .then((data) => {
        if (requestId.current === id) setState({ data, error: null, loading: false });
      })
      .catch((err: unknown) => {
        if (requestId.current === id) {
          setState({
            data: null,
            error: err instanceof Error ? err.message : "Something went wrong",
            loading: false,
          });
        }
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  return state;
}
