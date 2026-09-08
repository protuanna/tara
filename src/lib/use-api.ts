"use client";

import { useEffect, useRef, useState } from "react";
import { beginRefetch, endRefetch, announceResume } from "@/lib/refetch-indicator";

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
  const dataRef = useRef(data);
  dataRef.current = data;

  // Installed home-screen apps (iOS PWAs especially) get suspended and
  // resumed rather than reloaded when the user switches away and back —
  // the page/JS state just sits there, so without this the last-fetched
  // data stays on screen indefinitely instead of picking up anything that
  // changed while the app was in the background. Refetching here is safe
  // to do quietly: `loading` flips back to true but `data` is untouched
  // until the new response lands, and every screen already gates its
  // skeleton on `!data` (see the CLAUDE.md loading-gate note), not on
  // `loading` alone.
  useEffect(() => {
    function handleResume() {
      if (document.visibilityState === "visible") {
        announceResume();
        setReloadKey((k) => k + 1);
      }
    }
    document.addEventListener("visibilitychange", handleResume);
    window.addEventListener("pageshow", handleResume);
    return () => {
      document.removeEventListener("visibilitychange", handleResume);
      window.removeEventListener("pageshow", handleResume);
    };
  }, []);

  useEffect(() => {
    if (!url) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    // A revalidation (data already on screen from a prior load) feeds the
    // activeCount that <ResumeToast> watches to know when a resume-
    // triggered refetch has finished; the very first load already has its
    // own skeleton, so it's not counted here.
    const isRevalidation = dataRef.current !== null;
    if (isRevalidation) beginRefetch();
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
        if (isRevalidation) endRefetch();
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
