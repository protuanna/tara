"use client";

import { useEffect, useRef, useState } from "react";
import { subscribeResume, subscribeRefetch } from "@/lib/refetch-indicator";

const MIN_VISIBLE_MS = 1000;
const DONE_HOLD_MS = 1200;
// Safety net for a resume with nothing to refetch (e.g. a page with no
// useApiGet at all) — without this the toast would sit on "Đang cập nhật"
// forever since activeCount would never move off 0.
const NO_FETCH_FALLBACK_MS = 2500;

export function ResumeToast() {
  const [visible, setVisible] = useState(false);
  const [done, setDone] = useState(false);
  const shownAtRef = useRef(0);
  const hideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return subscribeResume(() => {
      if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
      shownAtRef.current = Date.now();
      setDone(false);
      setVisible(true);
      hideTimerRef.current = setTimeout(() => finish(), NO_FETCH_FALLBACK_MS);
    });
  }, []);

  useEffect(() => {
    return subscribeRefetch((count) => {
      if (count > 0 || !visible || done) return;
      finish();
    });
  }, [visible, done]);

  function finish() {
    if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
    const elapsed = Date.now() - shownAtRef.current;
    const wait = Math.max(0, MIN_VISIBLE_MS - elapsed);
    hideTimerRef.current = setTimeout(() => {
      setDone(true);
      hideTimerRef.current = setTimeout(() => setVisible(false), DONE_HOLD_MS);
    }, wait);
  }

  if (!visible) return null;

  return (
    <div className="pointer-events-none absolute inset-x-0 top-3 z-40 flex justify-center px-4">
      <div className="flex items-center gap-2 rounded-full bg-ink px-4 py-2 text-xs font-semibold text-white shadow-lg">
        {done ? (
          <>
            <span className="text-paid">✓</span> Đã cập nhật dữ liệu mới
          </>
        ) : (
          <>
            <span className="size-2 animate-ping rounded-full bg-white" />
            Đang cập nhật dữ liệu...
          </>
        )}
      </div>
    </div>
  );
}
