"use client";

import { useEffect, useState } from "react";
import { subscribeRefetch } from "@/lib/refetch-indicator";

/**
 * Thin sweeping bar at the very top of the app shell, shown while any
 * `useApiGet` is silently revalidating (app resumed from background, or a
 * mutation's refetch()) — visible proof the screen actually reloaded, since
 * those refetches deliberately don't touch the skeleton/existing content.
 */
export function ResumeLoadingBar() {
  const [active, setActive] = useState(false);

  useEffect(() => subscribeRefetch((count) => setActive(count > 0)), []);

  if (!active) return null;

  return (
    <div className="absolute inset-x-0 top-0 z-40 h-[3px] overflow-hidden bg-primary-tint">
      <div
        className="absolute h-full w-[35%] rounded-full bg-primary-dark"
        style={{ animation: "resume-loading-sweep 1s ease-in-out infinite" }}
      />
    </div>
  );
}
