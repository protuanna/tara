"use client";

import { use, useState } from "react";
import Link from "next/link";
import { useApiGet, apiMutate } from "@/lib/use-api";
import { formatVnd } from "@/lib/format";
import { formatOrderTime } from "@/lib/date";
import { Sheet } from "@/components/sheet";
import { Skeleton } from "@/components/skeleton";
import { CollectOrderPayment } from "@/components/collect-order-payment";
import { FULFILLMENT_LABEL, PAYMENT_LABEL, PAYMENT_METHOD_LABEL } from "@/lib/order-labels";
import type { DebtorDTO } from "@/lib/services/debtService";
import type { OrderListRow, StatusCounts } from "@/lib/services/ordersService";

type OrdersResponse = { orders: OrderListRow[]; statusCounts: StatusCounts };

export default function DebtorOrdersPage({
  params,
}: {
  params: Promise<{ customerId: string }>;
}) {
  const { customerId } = use(params);
  const { data: debtData, refetch: refetchDebt } = useApiGet<{
    debtors: DebtorDTO[];
    totalDebt: number;
  }>("/api/debt");
  const { data: ordersData, refetch: refetchOrders } = useApiGet<OrdersResponse>(
    `/api/orders?customerId=${customerId}&pay=debt`,
  );

  // Gate on the data itself, not `loading` — refetch() (after paying an
  // order or collecting all debt) flips loading back to true while the old
  // lists are still valid, and remounting the screen would close the open
  // confirm sheet mid-interaction.
  if (!debtData || !ordersData) return <DebtorOrdersSkeleton />;

  const debtor = debtData.debtors.find((d) => d.customer_id === customerId) ?? null;

  function refetchAll() {
    refetchDebt();
    refetchOrders();
  }

  return (
    <DebtorOrdersScreen
      customerId={customerId}
      debtor={debtor}
      orders={ordersData.orders}
      onChanged={refetchAll}
    />
  );
}

function DebtorOrdersScreen({
  customerId,
  debtor,
  orders,
  onChanged,
}: {
  customerId: string;
  debtor: DebtorDTO | null;
  orders: OrderListRow[];
  onChanged: () => void;
}) {
  const [collectOpen, setCollectOpen] = useState(false);
  const [collecting, setCollecting] = useState(false);

  const debt = debtor?.debt ?? 0;

  async function handleCollectAll() {
    setCollecting(true);
    await apiMutate(`/api/customers/${customerId}/collect-debt`, "POST");
    setCollecting(false);
    setCollectOpen(false);
    onChanged();
  }

  return (
    <div className="flex flex-col gap-3 px-4 py-3.5">
      <div className="flex items-center gap-2.5">
        <Link
          href="/debt"
          aria-label="Quay lại"
          className="flex size-[34px] flex-none items-center justify-center rounded-[11px] border border-line bg-white text-lg font-extrabold leading-none text-primary-dark"
        >
          ‹
        </Link>
        <div className="min-w-0 flex-1">
          <div className="truncate text-base font-extrabold">{debtor?.name ?? "Khách hàng"}</div>
          <div className="text-[11px] text-muted">{debtor?.phone || "Chưa có SĐT"}</div>
        </div>
      </div>

      <div className="flex items-center justify-between rounded-2xl bg-[#FBEAEA] p-3.5">
        <span className="text-[13px] text-[#8A2E2E]">Còn nợ</span>
        <span className="text-lg font-extrabold text-unpaid">{formatVnd(debt)}</span>
      </div>

      <div className="flex flex-col gap-2.5">
        {orders.length === 0 && (
          <div className="rounded-xl border border-line bg-white p-8 text-center text-sm text-muted">
            Khách không còn nợ đơn nào.
          </div>
        )}
        {orders.map((order) => {
          const itemCount = order.order_items.reduce((sum, i) => sum + i.qty, 0);
          const fulfillment = FULFILLMENT_LABEL[order.fulfillment_status];
          const payment = PAYMENT_LABEL[order.payment_status];
          return (
            <div
              key={order.id}
              className="flex flex-col gap-2.5 rounded-2xl border border-line bg-white p-3.5"
            >
              <Link href={`/orders/${order.id}`} className="flex flex-col gap-2.5">
                <div className="flex items-start justify-between gap-2.5">
                  <div className="flex flex-col gap-0.5">
                    <div className="text-sm font-bold">{formatOrderTime(order.created_at)}</div>
                    <div className="text-[11px] text-muted">
                      {itemCount} món · {PAYMENT_METHOD_LABEL[order.payment_method]}
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
              </Link>
              <CollectOrderPayment
                orderId={order.id}
                total={order.total}
                onChanged={onChanged}
                variant="row"
              />
            </div>
          );
        })}
      </div>

      {debt > 0 && (
        <button
          onClick={() => setCollectOpen(true)}
          className="rounded-xl bg-primary py-3.5 text-sm font-bold text-white"
        >
          Đã thu đủ nợ
        </button>
      )}

      <Sheet open={collectOpen} onClose={() => setCollectOpen(false)}>
        <div className="text-[15px] font-bold">Xác nhận đã thu đủ nợ?</div>
        <p className="text-[13px] leading-relaxed text-muted">
          Toàn bộ {orders.length} đơn nợ của khách sẽ chuyển sang đã thanh toán.
        </p>
        <button
          onClick={handleCollectAll}
          disabled={collecting}
          className="rounded-xl bg-primary py-3.5 text-sm font-bold text-white disabled:opacity-60"
        >
          {collecting ? "Đang cập nhật..." : `Xác nhận đã thu ${formatVnd(debt)}`}
        </button>
        <button
          onClick={() => setCollectOpen(false)}
          className="rounded-xl border border-line py-3.5 text-sm font-semibold text-ink"
        >
          Đóng
        </button>
      </Sheet>
    </div>
  );
}

function DebtorOrdersSkeleton() {
  return (
    <div className="flex flex-col gap-3 px-4 py-3.5">
      <div className="flex items-center gap-2.5">
        <Skeleton className="size-[34px] rounded-[11px]" />
        <Skeleton className="h-5 w-32 rounded" />
      </div>
      <Skeleton className="h-[64px] rounded-2xl" />
      <Skeleton className="h-[46px] rounded-xl" />
      <div className="flex flex-col gap-2.5">
        {Array.from({ length: 3 }, (_, i) => (
          <Skeleton key={i} className="h-[92px] rounded-2xl" />
        ))}
      </div>
    </div>
  );
}
