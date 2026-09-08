"use client";

import { use } from "react";
import Link from "next/link";
import { useApiGet } from "@/lib/use-api";
import { formatVnd } from "@/lib/format";
import { formatOrderTime } from "@/lib/date";
import { FULFILLMENT_LABEL, PAYMENT_LABEL } from "@/lib/order-labels";
import { OrderStatusActions } from "@/components/order-status-actions";
import { PencilIcon } from "@/components/icons";
import { Skeleton } from "@/components/skeleton";
import type { OrderDetailDTO } from "@/lib/services/ordersService";

export default function OrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { data: order, loading, error, refetch } = useApiGet<OrderDetailDTO>(`/api/orders/${id}`);

  // Gate on `!order`, not `loading` — refetch() (after cancel/deliver) flips
  // loading back to true while the old order is still valid; re-showing the
  // skeleton would unmount the action sheet mid-interaction.
  if (loading && !order) return <OrderDetailSkeleton />;

  if (error || !order) {
    return (
      <div className="flex flex-col items-center gap-3 px-6 pt-16 text-center">
        <div className="text-base font-bold">Không tìm thấy đơn hàng</div>
        <Link href="/orders" className="text-sm font-semibold text-primary-dark">
          Về danh sách đơn hàng
        </Link>
      </div>
    );
  }

  const fulfillment = FULFILLMENT_LABEL[order.fulfillment_status];
  const payment = PAYMENT_LABEL[order.payment_status];
  const itemCount = order.order_items.reduce((sum, i) => sum + i.qty, 0);
  const canDeliver =
    order.fulfillment_status === "pending" || order.fulfillment_status === "processing";

  return (
    <div className="flex flex-col gap-3 px-4 pb-6 pt-3">
      <div className="flex items-center gap-2.5">
        <Link
          href="/"
          aria-label="Trang chủ"
          className="flex size-[34px] flex-none items-center justify-center rounded-[11px] border border-line bg-white text-lg font-extrabold leading-none text-primary-dark"
        >
          ‹
        </Link>
        <div className="flex-1 text-base font-extrabold">Chi tiết đơn</div>
        {canDeliver && (
          <Link
            href={`/orders/${order.id}/edit`}
            aria-label="Sửa đơn hàng"
            className="flex size-[34px] flex-none items-center justify-center rounded-[11px] border border-line bg-white text-primary-dark"
          >
            <PencilIcon className="size-[17px]" />
          </Link>
        )}
      </div>

      <div className="flex flex-col gap-3 rounded-2xl border border-line bg-white p-4">
        <div className="flex items-start justify-between gap-2.5">
          <div className="flex flex-col gap-0.5">
            <div className="text-[15px] font-extrabold">
              {order.customers?.name ?? "Khách lẻ"}
            </div>
            <div className="text-[11.5px] text-muted">
              {formatOrderTime(order.created_at)} · {itemCount} món
            </div>
          </div>
          <div
            className={`flex-none whitespace-nowrap rounded-full px-2.5 py-1 text-[10.5px] font-bold ${fulfillment.bg} ${fulfillment.fg}`}
          >
            {fulfillment.label}
          </div>
        </div>

        <div className="flex flex-col gap-2 border-t border-primary-tint pt-3">
          {order.order_items.map((item) => (
            <div key={item.id} className="flex justify-between gap-2.5 text-[13px]">
              <span>
                {item.name} x{item.qty}
              </span>
              <span className="font-bold">{formatVnd(item.price * item.qty)}</span>
            </div>
          ))}
        </div>

        <div className="flex flex-col gap-1.5 border-t border-primary-tint pt-3 text-[12.5px]">
          <div className="flex justify-between">
            <span className="text-muted">Tiền hàng</span>
            <span className="font-semibold">{formatVnd(order.subtotal)}</span>
          </div>
          {order.fee > 0 && (
            <div className="flex justify-between">
              <span className="text-muted">Phí vận chuyển</span>
              <span className="font-bold text-processing">+ {formatVnd(order.fee)}</span>
            </div>
          )}
          {order.topping_fee > 0 && (
            <div className="flex justify-between">
              <span className="text-muted">Topping</span>
              <span className="font-bold text-processing">+ {formatVnd(order.topping_fee)}</span>
            </div>
          )}
          {order.discount_amount > 0 && (
            <div className="flex justify-between">
              <span className="text-muted">Giảm giá</span>
              <span className="font-bold text-paid">− {formatVnd(order.discount_amount)}</span>
            </div>
          )}
        </div>

        <div className="flex items-baseline justify-between">
          <span className="text-sm font-bold">Khách phải trả</span>
          <span className="text-lg font-extrabold text-primary-dark">
            {formatVnd(order.total)}
          </span>
        </div>

        <div className="flex justify-between text-[12.5px]">
          <span className="text-muted">Thanh toán</span>
          <span className={`font-bold ${payment.fg}`}>{payment.label}</span>
        </div>
      </div>

      {canDeliver ? (
        <OrderStatusActions orderId={order.id} onChanged={refetch} variant="page" />
      ) : order.fulfillment_status === "done" ? (
        <div className="rounded-2xl bg-primary-tint p-3.5 text-center text-[13px] font-semibold text-primary-dark">
          Đơn đã giao xong
        </div>
      ) : null}
    </div>
  );
}

function OrderDetailSkeleton() {
  return (
    <div className="flex flex-col gap-3 px-4 pb-6 pt-3">
      <div className="flex items-center gap-2.5">
        <Skeleton className="size-[34px] rounded-[11px]" />
        <Skeleton className="h-5 w-28 rounded" />
      </div>
      <Skeleton className="h-[280px] rounded-2xl" />
      <Skeleton className="h-[54px] rounded-2xl" />
    </div>
  );
}
