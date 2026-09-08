"use client";

import { useState } from "react";
import { useApiGet, apiMutate } from "@/lib/use-api";
import { BellIcon } from "@/components/icons";
import { Sheet } from "@/components/sheet";
import { formatOrderTime } from "@/lib/date";
import type { NotificationDTO } from "@/lib/services/notificationsService";

export function NotificationBell() {
  const { data: notifications, refetch } = useApiGet<NotificationDTO[]>("/api/notifications");
  const [open, setOpen] = useState(false);

  const unreadCount = (notifications ?? []).filter((n) => !n.read).length;

  async function handleOpen() {
    setOpen(true);
    if (unreadCount > 0) {
      await apiMutate("/api/notifications/read-all", "POST");
      refetch();
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={handleOpen}
        aria-label="Thông báo"
        className="relative flex size-[38px] flex-none items-center justify-center rounded-full bg-white/20 text-white"
      >
        <BellIcon width={19} height={19} />
        {unreadCount > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-unpaid px-1 text-[10px] font-bold leading-none text-white">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      <Sheet open={open} onClose={() => setOpen(false)}>
        <div className="text-sm font-bold">Thông báo</div>
        <div className="flex flex-col gap-2">
          {(notifications ?? []).length === 0 && (
            <p className="py-6 text-center text-sm text-muted">Chưa có thông báo nào.</p>
          )}
          {(notifications ?? []).map((n) => (
            <div
              key={n.id}
              className={`rounded-xl border border-line px-3.5 py-3 ${n.read ? "bg-white" : "bg-primary-tint"}`}
            >
              <div className="text-[13px] font-semibold">{n.title}</div>
              <div className="mt-0.5 text-[13px] text-muted">{n.body}</div>
              <div className="mt-1 text-[11px] text-muted">{formatOrderTime(n.createdAt)}</div>
            </div>
          ))}
        </div>
      </Sheet>
    </>
  );
}
