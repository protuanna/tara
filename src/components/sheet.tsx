"use client";

import type { ReactNode } from "react";

/**
 * Bottom sheet overlay. Uses `position: fixed` (viewport-relative, dims the
 * whole browser window) with the panel itself capped to the app's
 * max-w-[480px] column, rather than `absolute` inside the shell — the
 * shell's content area scrolls (`overflow-y-auto`), which would clip an
 * absolutely-positioned sheet to that scroll region instead of covering the
 * header/bottom nav too.
 */
export function Sheet({
  open,
  onClose,
  children,
}: {
  open: boolean;
  onClose: () => void;
  children: ReactNode;
}) {
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-30 flex items-end justify-center bg-black/40"
      onClick={onClose}
    >
      <div
        className="flex max-h-[85%] w-full max-w-[480px] flex-col gap-3.5 overflow-y-auto rounded-t-[20px] bg-white p-[18px]"
        onClick={(e) => e.stopPropagation()}
      >
        {children}
      </div>
    </div>
  );
}
