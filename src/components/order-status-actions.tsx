"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Sheet } from "@/components/sheet";
import { cancelOrder, deliverOrder } from "@/app/orders/actions";

/**
 * Cancel / mark-delivered controls for an order that's still
 * pending/processing. Used both on the `/orders` list rows (compact,
 * side-by-side buttons) and the `/orders/[id]` detail page (full-width) —
 * `variant` only changes the trigger buttons' layout, the two confirm
 * sheets are identical. Calls `router.refresh()` after a successful
 * mutation so the Server Component data (list/detail) re-fetches.
 */
export function OrderStatusActions({
  orderId,
  customerId,
  variant,
}: {
  orderId: string;
  customerId: string;
  variant: "row" | "page";
}) {
  const router = useRouter();
  const [cancelOpen, setCancelOpen] = useState(false);
  const [deliverOpen, setDeliverOpen] = useState(false);
  const [pending, setPending] = useState(false);

  async function handleCancel() {
    setPending(true);
    await cancelOrder(orderId);
    setPending(false);
    setCancelOpen(false);
    router.refresh();
  }

  async function handleDeliver(paid: boolean) {
    setPending(true);
    await deliverOrder(orderId, customerId, paid);
    setPending(false);
    setDeliverOpen(false);
    router.refresh();
  }

  const buttonClass =
    variant === "row"
      ? "flex-1 rounded-[10px] py-[11px] text-[13px] font-bold"
      : "flex-1 rounded-2xl py-3.5 text-[14px] font-bold";

  return (
    <>
      <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
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
    </>
  );
}
