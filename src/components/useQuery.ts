"use client";

import { useCallback, useEffect, useState } from "react";
import { errorMessage } from "@/lib/format";

/**
 * Runs `fetcher` whenever its identity changes (wrap it in useCallback with its inputs)
 * and ignores responses from superseded requests. Previous data stays visible while reloading.
 */
export function useQuery<T>(fetcher: () => Promise<{ data: T }>, fallbackError = "Request failed") {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  // Which request last finished; loading is derived from it instead of toggled inside the effect.
  const [settled, setSettled] = useState<{ fetcher: unknown; reloadKey: number } | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetcher()
      .then((res) => {
        if (cancelled) return;
        setData(res.data);
        setError(null);
      })
      .catch((err) => {
        if (!cancelled) setError(errorMessage(err, fallbackError));
      })
      .finally(() => {
        if (!cancelled) setSettled({ fetcher, reloadKey });
      });
    return () => {
      cancelled = true;
    };
  }, [fetcher, reloadKey, fallbackError]);

  const reload = useCallback(() => setReloadKey((k) => k + 1), []);
  const loading = !settled || settled.fetcher !== fetcher || settled.reloadKey !== reloadKey;

  return { data, setData, error, loading, reload };
}
