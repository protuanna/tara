"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useApiGet } from "@/lib/use-api";
import { formatVnd } from "@/lib/format";
import { formatOrderTime, vnDateKey, formatDateRangeShort } from "@/lib/date";
import { FULFILLMENT_LABEL, PAYMENT_LABEL, PAYMENT_METHOD_LABEL } from "@/lib/order-labels";
import { Sheet } from "@/components/sheet";
import { Skeleton } from "@/components/skeleton";
import { OrderStatusActions } from "@/components/order-status-actions";
import { CollectOrderPayment } from "@/components/collect-order-payment";
import type {
  OrderListRow,
  StatusCounts,
  StatusFilter,
  TimeFilter,
  PayFilter,
} from "@/lib/services/ordersService";

const STATUS_TABS: { value: StatusFilter; label: string }[] = [
  { value: "all", label: "Tất cả" },
  { value: "pending", label: "Chờ xác nhận" },
  { value: "processing", label: "Đang xử lý" },
  { value: "done", label: "Đã giao" },
  { value: "cancel", label: "Đã hủy" },
];

const TIME_CHIPS: { value: TimeFilter; label: string }[] = [
  { value: "all", label: "Tất cả thời gian" },
  { value: "today", label: "Hôm nay" },
  { value: "7d", label: "7 ngày" },
  { value: "30d", label: "30 ngày" },
];

const PAY_CHIPS: { value: PayFilter; label: string }[] = [
  { value: "all", label: "Mọi thanh toán" },
  { value: "paid", label: "Đã thanh toán" },
  { value: "unpaid", label: "Chưa thanh toán" },
  { value: "debt", label: "Đã ghi nợ" },
];

function ordersUrl(next: {
  status: StatusFilter;
  time: TimeFilter;
  pay: PayFilter;
  from?: string;
  to?: string;
}): string {
  const params = new URLSearchParams();
  if (next.status !== "all") params.set("status", next.status);
  if (next.time !== "all") params.set("time", next.time);
  if (next.time === "custom") {
    if (next.from) params.set("from", next.from);
    if (next.to) params.set("to", next.to);
  }
  if (next.pay !== "all") params.set("pay", next.pay);
  const qs = params.toString();
  return qs ? `/orders?${qs}` : "/orders";
}

// useSearchParams() opts the subtree into client-only rendering, which
// Next.js requires wrapping in Suspense so the rest of the route can still
// have a static shell.
export default function OrdersPage() {
  return (
    <Suspense fallback={<OrdersSkeleton />}>
      <OrdersContent />
    </Suspense>
  );
}

function OrdersContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const activeStatus = (searchParams.get("status") as StatusFilter) || "all";
  const activeTime = (searchParams.get("time") as TimeFilter) || "all";
  const activePay = (searchParams.get("pay") as PayFilter) || "all";
  const activeFrom = searchParams.get("from") ?? "";
  const activeTo = searchParams.get("to") ?? "";

  const apiUrl = `/api/orders?${new URLSearchParams({
    ...(activeStatus !== "all" ? { status: activeStatus } : {}),
    ...(activeTime !== "all" ? { time: activeTime } : {}),
    ...(activePay !== "all" ? { pay: activePay } : {}),
    ...(activeTime === "custom" && activeFrom ? { from: activeFrom } : {}),
    ...(activeTime === "custom" && activeTo ? { to: activeTo } : {}),
  }).toString()}`;

  const { data, refetch } = useApiGet<{ orders: OrderListRow[]; statusCounts: StatusCounts }>(
    apiUrl,
  );

  const [filterOpen, setFilterOpen] = useState(false);
  const today = vnDateKey(new Date());
  const [rangeOpen, setRangeOpen] = useState(false);
  const [fromInput, setFromInput] = useState(activeFrom || today);
  const [toInput, setToInput] = useState(activeTo || today);

  function openRangePicker() {
    setFromInput(activeFrom || today);
    setToInput(activeTo || today);
    setRangeOpen(true);
  }

  function handleApplyRange() {
    setRangeOpen(false);
    setFilterOpen(false);
    router.push(
      ordersUrl({
        status: activeStatus,
        time: "custom",
        pay: activePay,
        from: fromInput,
        to: toInput,
      }),
    );
  }

  // Gate on `!data` alone, not `loading` — refetch() (after cancel/deliver)
  // flips loading back to true while old data is still valid, and we don't
  // want the whole list to flash back to a skeleton (unmounting any open
  // sheet) every time a mutation completes.
  if (!data) return <OrdersSkeleton />;

  const { orders, statusCounts } = data;
  const activeFilterCount = (activeTime !== "all" ? 1 : 0) + (activePay !== "all" ? 1 : 0);

  return (
    <div className="flex flex-col">
      <div className="sticky top-0 z-[4] flex items-center gap-2.5 border-b border-line bg-white px-4 py-3">
        <div className="no-scrollbar flex flex-1 gap-2 overflow-x-auto">
          {STATUS_TABS.map((tab) => {
            const active = tab.value === activeStatus;
            const label =
              active && tab.value !== "all"
                ? `${tab.label} ${statusCounts[tab.value]}`
                : tab.label;
            return (
              <Link
                key={tab.value}
                href={ordersUrl({ status: tab.value, time: activeTime, pay: activePay })}
                className={`flex-none whitespace-nowrap rounded-full px-3.5 py-2 text-xs font-semibold ${
                  active ? "bg-primary text-white shadow-md" : "bg-primary-tint text-primary-dark"
                }`}
              >
                {label}
              </Link>
            );
          })}
        </div>
        <button
          onClick={() => setFilterOpen(true)}
          className={`flex flex-none items-center gap-1.5 whitespace-nowrap rounded-full border px-3.5 py-2 text-xs font-semibold ${
            activeFilterCount > 0
              ? "border-primary bg-primary-tint text-primary-dark"
              : "border-line bg-white text-primary-dark"
          }`}
        >
          Bộ lọc{activeFilterCount > 0 ? ` · ${activeFilterCount}` : ""}
        </button>
      </div>

      <div className="flex flex-col gap-2.5 px-4 py-3.5">
        {orders.length === 0 && (
          <div className="rounded-xl border border-line bg-white p-8 text-center text-sm text-muted">
            Không có đơn nào khớp bộ lọc.
          </div>
        )}

        {orders.map((order) => {
          const fulfillment = FULFILLMENT_LABEL[order.fulfillment_status];
          const payment = PAYMENT_LABEL[order.payment_status];
          const itemCount = order.order_items.reduce((sum, i) => sum + i.qty, 0);
          const showActions =
            order.fulfillment_status === "pending" || order.fulfillment_status === "processing";
          const showCollectPayment =
            order.fulfillment_status === "done" && order.payment_status === "debt";

          return (
            <Link
              key={order.id}
              href={`/orders/${order.id}`}
              className="flex flex-col gap-2.5 rounded-2xl border border-line bg-white p-3.5"
            >
              <div className="flex items-start justify-between gap-2.5">
                <div className="flex flex-col gap-0.5">
                  <div className="text-sm font-bold">{order.customers?.name ?? "Khách lẻ"}</div>
                  <div className="text-[11px] text-muted">
                    {formatOrderTime(order.created_at)} · {itemCount} món ·{" "}
                    {PAYMENT_METHOD_LABEL[order.payment_method]}
                  </div>
                </div>
                <div
                  className={`flex-none whitespace-nowrap rounded-full px-2.5 py-1 text-[10px] font-bold ${fulfillment.bg} ${fulfillment.fg}`}
                >
                  {fulfillment.label}
                </div>
              </div>

              <div className="flex items-baseline justify-between border-t border-primary-tint pt-2.5">
                <span className={`text-xs font-semibold ${payment.fg}`}>{payment.label}</span>
                <span className="text-base font-extrabold">{formatVnd(order.total)}</span>
              </div>

              {showActions && (
                <OrderStatusActions
                  orderId={order.id}
                  paymentStatus={order.payment_status}
                  onChanged={refetch}
                  variant="row"
                />
              )}
              {showCollectPayment && (
                <CollectOrderPayment
                  orderId={order.id}
                  total={order.total}
                  onChanged={refetch}
                  variant="row"
                />
              )}
            </Link>
          );
        })}
      </div>

      <Sheet open={filterOpen} onClose={() => setFilterOpen(false)}>
        <div className="flex items-center justify-between">
          <div className="text-[15px] font-bold">Bộ lọc đơn hàng</div>
          <button onClick={() => setFilterOpen(false)} className="text-lg font-bold text-muted">
            ×
          </button>
        </div>

        <div className="flex flex-col gap-2">
          <div className="text-xs font-semibold text-muted">Thời gian</div>
          <div className="flex flex-wrap gap-2">
            {TIME_CHIPS.map((chip) => (
              <Link
                key={chip.value}
                href={ordersUrl({ status: activeStatus, time: chip.value, pay: activePay })}
                className={`whitespace-nowrap rounded-full border px-3 py-1.5 text-xs font-semibold ${
                  chip.value === activeTime
                    ? "border-primary bg-primary-tint text-primary-dark"
                    : "border-line bg-white text-muted"
                }`}
              >
                {chip.label}
              </Link>
            ))}
            <button
              onClick={openRangePicker}
              className={`whitespace-nowrap rounded-full border px-3 py-1.5 text-xs font-semibold ${
                activeTime === "custom"
                  ? "border-primary bg-primary-tint text-primary-dark"
                  : "border-line bg-white text-muted"
              }`}
            >
              {activeTime === "custom" && activeFrom && activeTo
                ? formatDateRangeShort(activeFrom, activeTo)
                : "Tùy chọn"}
            </button>
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <div className="text-xs font-semibold text-muted">Trạng thái thanh toán</div>
          <div className="flex flex-wrap gap-2">
            {PAY_CHIPS.map((chip) => (
              <Link
                key={chip.value}
                href={ordersUrl({ status: activeStatus, time: activeTime, pay: chip.value })}
                className={`whitespace-nowrap rounded-full border px-3 py-1.5 text-xs font-semibold ${
                  chip.value === activePay
                    ? "border-primary bg-primary-tint text-primary-dark"
                    : "border-line bg-white text-muted"
                }`}
              >
                {chip.label}
              </Link>
            ))}
          </div>
        </div>

        <div className="flex gap-2.5">
          <Link
            href={ordersUrl({ status: activeStatus, time: "all", pay: "all" })}
            className="flex-1 rounded-xl bg-[#F1F0F3] py-3.5 text-center text-sm font-semibold text-ink"
          >
            Xóa lọc
          </Link>
          <button
            onClick={() => setFilterOpen(false)}
            className="flex-[1.4] rounded-xl bg-primary py-3.5 text-sm font-bold text-white"
          >
            Áp dụng
          </button>
        </div>
      </Sheet>

      <Sheet open={rangeOpen} onClose={() => setRangeOpen(false)}>
        <div className="text-[15px] font-bold">Chọn khoảng thời gian</div>
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-semibold text-muted">Từ ngày</label>
          <input
            type="date"
            value={fromInput}
            max={toInput}
            onChange={(e) => setFromInput(e.target.value)}
            className="rounded-[10px] border border-line px-3 py-3 text-base"
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-semibold text-muted">Đến ngày</label>
          <input
            type="date"
            value={toInput}
            min={fromInput}
            onChange={(e) => setToInput(e.target.value)}
            className="rounded-[10px] border border-line px-3 py-3 text-base"
          />
        </div>
        <button
          onClick={handleApplyRange}
          disabled={!fromInput || !toInput}
          className="rounded-xl bg-primary py-3.5 text-sm font-bold text-white disabled:opacity-60"
        >
          Áp dụng
        </button>
      </Sheet>
    </div>
  );
}

function OrdersSkeleton() {
  return (
    <div className="flex flex-col">
      <div className="flex items-center gap-2.5 border-b border-line bg-white px-4 py-3">
        <div className="no-scrollbar flex flex-1 gap-2 overflow-x-auto">
          {Array.from({ length: 4 }, (_, i) => (
            <Skeleton key={i} className="h-8 w-20 flex-none rounded-full" />
          ))}
        </div>
        <Skeleton className="h-8 w-16 flex-none rounded-full" />
      </div>
      <div className="flex flex-col gap-2.5 px-4 py-3.5">
        {Array.from({ length: 5 }, (_, i) => (
          <Skeleton key={i} className="h-[92px] rounded-2xl" />
        ))}
      </div>
    </div>
  );
}
