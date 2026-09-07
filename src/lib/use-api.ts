"use client";

import { useEffect, useState } from "react";

type ApiSuccess<T> = { data: T };
type ApiFailure = { error: string; message: string; statusCode: number };

/**
 * Client-side GET + loading/error state, matching the plain
 * fetch()-in-useEffect pattern (no React Query) used throughout
 * bizmail-client-next. `url: null` skips fetching (e.g. while a required id
 * isn't known yet). `deps` lets a component force a refetch when something
 * outside the url string changes; call the returned `refetch()` after a
 * mutation instead of duplicating fetch logic per screen.
 */
export function useApiGet<T>(url: string | null, deps: unknown[] = []) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    if (!url) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError(null);
    fetch(url)
      .then((res) => res.json() as Promise<ApiSuccess<T> | ApiFailure>)
      .then((json) => {
        if (cancelled) return;
        if ("error" in json) setError(json.message || json.error);
        else setData(json.data);
      })
      .catch((err: unknown) => {
        if (!cancelled) setError(err instanceof Error ? err.message : "Lỗi tải dữ liệu");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [url, reloadKey, ...deps]);

  return { data, loading, error, refetch: () => setReloadKey((k) => k + 1) };
}

/** POST/PATCH/DELETE helper — same success/error envelope as useApiGet. */
export async function apiMutate<T>(
  url: string,
  method: "POST" | "PATCH" | "DELETE" = "POST",
  body?: unknown,
): Promise<{ data: T } | { error: string }> {
  try {
    const res = await fetch(url, {
      method,
      headers: body !== undefined ? { "Content-Type": "application/json" } : undefined,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
    const json = (await res.json()) as ApiSuccess<T> | ApiFailure;
    if ("error" in json) return { error: json.message || json.error };
    return { data: json.data };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Lỗi kết nối" };
  }
}
