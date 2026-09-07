"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Sheet } from "@/components/sheet";
import { apiMutate } from "@/lib/use-api";

/**
 * Cancel / mark-delivered controls for an order that's still
 * pending/processing. Used both on the `/orders` list rows (compact,
 * side-by-side buttons) and the `/orders/[id]` detail page (full-width) —
 * `variant` only changes the trigger buttons' layout, the two confirm
 * sheets are identical. Calls `router.refresh()` after a successful
 * mutation — harmless no-op for these client-fetched pages, kept in case a
 * server-rendered ancestor ever needs to revalidate too.
 */
export function OrderStatusActions({
  orderId,
  onChanged,
  variant,
}: {
  orderId: string;
  onChanged: () => void;
  variant: "row" | "page";
}) {
  const router = useRouter();
  const [cancelOpen, setCancelOpen] = useState(false);
  const [deliverOpen, setDeliverOpen] = useState(false);
  const [pending, setPending] = useState(false);

  async function handleCancel() {
    setPending(true);
    await apiMutate(`/api/orders/${orderId}/cancel`, "POST");
    setPending(false);
    setCancelOpen(false);
    router.refresh();
    onChanged();
  }

  async function handleDeliver(paid: boolean) {
    setPending(true);
    await apiMutate(`/api/orders/${orderId}/deliver`, "POST", { paid });
    setPending(false);
    setDeliverOpen(false);
    router.refresh();
    onChanged();
  }

  const buttonClass =
    variant === "row"
      ? "flex-1 rounded-[10px] py-[11px] text-[13px] font-bold"
      : "flex-1 rounded-2xl py-3.5 text-[14px] font-bold";

  return (
    // Rows on `/orders` wrap this whole component in a <Link> (so tapping
    // the row navigates to the detail page). Cancel that with
    // preventDefault(), not stopPropagation(): Next's <Link> only skips its
    // own navigation when it sees event.defaultPrevented on the click that
    // reaches its onClick handler. stopPropagation() would stop the event
    // from ever reaching that handler at all — which stops Link from
    // calling ITS OWN preventDefault(), so the browser falls through to the
    // native <a href> action instead (a full page reload, worse than the
    // soft-navigation bug this was meant to fix). Applies to every click
    // here, including inside the two <Sheet>s below (a Sheet isn't a
    // portal, so its clicks still bubble through this DOM subtree).
    <div onClick={(e) => e.preventDefault()}>
      <div className="flex gap-2">
        <button
          onClick={() => setCancelOpen(true)}
          className={`${buttonClass} bg-[#F1F0F3] text-unpaid`}
        >
          Hủy đơn
        </button>
        <button
          onClick={() => setDeliverOpen(true)}
          className={`${buttonClass} bg-primary text-white`}
        >
          Đã giao
        </button>
      </div>

      <Sheet open={cancelOpen} onClose={() => setCancelOpen(false)}>
        <div className="text-[15px] font-bold">Hủy đơn này?</div>
        <p className="text-[13px] leading-relaxed text-muted">
          Đơn sẽ chuyển sang trạng thái đã hủy và không tính vào doanh thu.
        </p>
        <button
          onClick={handleCancel}
          disabled={pending}
          className="rounded-xl bg-unpaid py-3.5 text-sm font-bold text-white disabled:opacity-60"
        >
          Hủy đơn
        </button>
        <button
          onClick={() => setCancelOpen(false)}
          className="rounded-xl border border-line py-3.5 text-sm font-semibold text-ink"
        >
          Giữ đơn
        </button>
      </Sheet>

      <Sheet open={deliverOpen} onClose={() => setDeliverOpen(false)}>
        <div className="text-[15px] font-bold">Đơn đã giao — tiền thì sao?</div>
        <button
          onClick={() => handleDeliver(true)}
          disabled={pending}
          className="rounded-xl bg-primary py-3.5 text-sm font-bold text-white disabled:opacity-60"
        >
          Đã thanh toán
        </button>
        <button
          onClick={() => handleDeliver(false)}
          disabled={pending}
          className="rounded-xl border border-line py-3.5 text-sm font-bold text-ink disabled:opacity-60"
        >
          Thanh toán sau
        </button>
      </Sheet>
    </div>
  );
}
