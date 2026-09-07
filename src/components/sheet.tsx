"use client";

import type { ReactNode } from "react";

/**
 * Bottom sheet overlay. Uses `position: fixed` (viewport-relative, dims the
 * whole browser window) with the panel itself capped to the app's
 * max-w-[480px] column, rather than `absolute` inside the shell — the
 * shell's content area scrolls (`overflow-y-auto`), which would clip an
 * absolutely-positioned sheet to that scroll region instead of covering the
 * header/bottom nav too.
 *
 * The panel calls stopPropagation() so clicking its content doesn't bubble
 * to the backdrop's onClose — but a Sheet can be rendered inside a <Link>
 * (e.g. the confirm sheets in `<OrderStatusActions>` on `/orders` rows), and
 * that same stopPropagation() also stops the click from ever reaching an
 * ancestor's preventDefault(). Without preventDefault() here too, nothing
 * stops Link's native <a href> default action, and clicking a button inside
 * the sheet does a full page navigation instead of just running its
 * onClick. Harmless no-op when the Sheet isn't inside a Link.
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
        onClick={(e) => {
          e.stopPropagation();
          e.preventDefault();
        }}
      >
        {children}
      </div>
    </div>
  );
}
