'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { api, ApiError, errorMessage } from './api';
import type { PaginationMeta } from './types';

type Query = Record<string, string | number | boolean | undefined | null>;

interface ListState<T> {
  items: T[];
  pagination: PaginationMeta | null;
  loading: boolean;
  error: string | null;
  /** True when the list failed with a 403 — surface a friendly "not permitted" UI. */
  forbidden: boolean;
}

/**
 * Fetch a paginated list endpoint and keep it in sync with a query object.
 * Refetches whenever `path` or the serialized query changes. Returns a `reload`
 * callback for imperative refreshes (e.g. after a mutating row action).
 */
export function usePaginatedList<T>(path: string, query: Query) {
  const [state, setState] = useState<ListState<T>>({
    items: [],
    pagination: null,
    loading: true,
    error: null,
    forbidden: false,
  });

  // Serialize the query so the effect only re-runs on real changes.
  const key = JSON.stringify(query);
  const queryRef = useRef(query);
  queryRef.current = query;

  const load = useCallback(
    async (signal?: AbortSignal) => {
      setState((s) => ({ ...s, loading: true, error: null, forbidden: false }));
      try {
        const { data, pagination } = await api.getList<T>(path, { query: queryRef.current, signal });
        if (signal?.aborted) return;
        setState({ items: data, pagination, loading: false, error: null, forbidden: false });
      } catch (err) {
        if (signal?.aborted) return;
        const forbidden = err instanceof ApiError && err.isForbidden;
        setState({ items: [], pagination: null, loading: false, error: errorMessage(err), forbidden });
      }
    },
    [path],
  );

  useEffect(() => {
    const controller = new AbortController();
    void load(controller.signal);
    return () => controller.abort();
    // `key` is intentionally part of the dependency list to refetch on query change.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [load, key]);

  const reload = useCallback(() => load(), [load]);

  return { ...state, reload };
}

/** Debounce a rapidly-changing value (e.g. a search box) by `delay` ms. */
export function useDebouncedValue<T>(value: T, delay = 350): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
}
