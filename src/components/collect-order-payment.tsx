"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Sheet } from "@/components/sheet";
import { apiMutate } from "@/lib/use-api";
import { formatVnd } from "@/lib/format";

/**
 * "Thanh toán đơn hàng" / "Hủy đơn" controls for an order that's
 * `fulfillment_status = "done"` but `payment_status = "debt"` — the
 * per-order counterpart to the "Đã thu đủ nợ" action on `/debt`/`/customers`
 * (which settles every debt order for a customer at once). Same row/page
 * `variant` + preventDefault-inside-a-Link pattern as `<OrderStatusActions>`,
 * since this also shows up nested in a `/orders` row's `<Link>`.
 *
 * Cancelling here (unlike the pending/processing cancel in
 * `<OrderStatusActions>`) applies to an already-*delivered* order: the shop
 * gave the goods away on credit and is now writing that off instead of
 * collecting. `ordersService.cancel()` resets `payment_status` from
 * `"debt"` back to `"unpaid"` when it does this, so the order drops out of
 * `customer_debts` — the confirm copy below reflects that.
 */
export function CollectOrderPayment({
  orderId,
  total,
  onChanged,
  variant,
}: {
  orderId: string;
  total: number;
  onChanged: () => void;
  variant: "row" | "page";
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [pending, setPending] = useState(false);

  async function handlePay() {
    setPending(true);
    await apiMutate(`/api/orders/${orderId}/pay`, "POST");
    setPending(false);
    setOpen(false);
    router.refresh();
    onChanged();
  }

  async function handleCancel() {
    setPending(true);
    await apiMutate(`/api/orders/${orderId}/cancel`, "POST");
    setPending(false);
    setCancelOpen(false);
    router.refresh();
    onChanged();
  }

  const buttonClass =
    variant === "row"
      ? "flex-1 rounded-[10px] py-[11px] text-[13px] font-bold"
      : "flex-1 rounded-2xl py-3.5 text-[14px] font-bold";

  return (
    <div onClick={(e) => e.preventDefault()}>
      <div className="flex gap-2">
        <button
          onClick={() => setCancelOpen(true)}
          className={`${buttonClass} bg-[#F1F0F3] text-unpaid`}
        >
          Hủy đơn
        </button>
        <button onClick={() => setOpen(true)} className={`${buttonClass} bg-primary text-white`}>
          Thanh toán đơn hàng
        </button>
      </div>

      <Sheet open={open} onClose={() => setOpen(false)}>
        <div className="text-[15px] font-bold">Xác nhận đã thu tiền?</div>
        <p className="text-[13px] leading-relaxed text-muted">
          Đơn sẽ chuyển sang đã thanh toán và trừ khỏi công nợ của khách.
        </p>
        <button
          onClick={handlePay}
          disabled={pending}
          className="rounded-xl bg-primary py-3.5 text-sm font-bold text-white disabled:opacity-60"
        >
          {pending ? "Đang cập nhật..." : `Xác nhận đã thu ${formatVnd(total)}`}
        </button>
        <button
          onClick={() => setOpen(false)}
          className="rounded-xl border border-line py-3.5 text-sm font-semibold text-ink"
        >
          Đóng
        </button>
      </Sheet>

      <Sheet open={cancelOpen} onClose={() => setCancelOpen(false)}>
        <div className="text-[15px] font-bold">Hủy đơn này?</div>
        <p className="text-[13px] leading-relaxed text-muted">
          Đơn đã giao sẽ chuyển sang trạng thái đã hủy và xóa khỏi công nợ của khách.
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
    </div>
  );
}
