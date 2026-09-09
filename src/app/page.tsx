"use client";

import Link from "next/link";
import { useApiGet } from "@/lib/use-api";
import { formatVnd } from "@/lib/format";
import { formatOrderTime } from "@/lib/date";
import { QuickAction } from "@/components/quick-action";
import { CartIcon, ReceiptIcon, BoxIcon, PeopleIcon, WalletIcon } from "@/components/icons";
import { Skeleton } from "@/components/skeleton";
import type { DashboardDTO } from "@/lib/services/homeService";

export default function HomePage() {
  const { data, loading, error } = useApiGet<DashboardDTO>("/api/home");

  if (loading) return <HomeSkeleton />;
  if (error || !data) {
    return <p className="p-4 text-center text-sm text-unpaid">{error ?? "Không tải được dữ liệu"}</p>;
  }

  return (
    <div className="flex flex-col gap-3 px-4 pb-6 pt-3">
      <div className="flex flex-col gap-1.5 rounded-[18px] bg-gradient-to-br from-primary to-primary-dark p-5 text-white">
        <div className="text-sm font-bold opacity-95">Tara&apos;Shop</div>
        <div className="text-[13px] opacity-85">Doanh thu hôm nay</div>
        <div className="text-3xl font-extrabold">{formatVnd(data.todayRevenue)}</div>
        <div className="text-[13px] opacity-85">{data.todayOrdersCount} đơn đã bán</div>
      </div>

      <div className="grid grid-cols-2 gap-2.5">
        <div className="flex flex-col gap-1 rounded-[14px] border border-line bg-white p-3.5">
          <div className="text-xs text-muted">Khách còn nợ</div>
          <div className="text-xl font-bold">{data.debtorCount}</div>
        </div>
        <div className="flex flex-col gap-1 rounded-[14px] border border-line bg-white p-3.5">
          <div className="text-xs text-muted">Tổng phải thu</div>
          <div className="text-xl font-bold text-unpaid">{formatVnd(data.totalDebt)}</div>
        </div>
      </div>

      <div className="grid grid-cols-5 gap-1.5 rounded-[18px] border border-line bg-white px-2 py-4">
        <QuickAction href="/sale" label="Bán hàng" bg="bg-primary-tint" fg="text-primary-dark">
          <CartIcon width={23} height={23} />
        </QuickAction>
        <QuickAction href="/orders" label="Xem đơn" bg="bg-[#E6F6F4]" fg="text-[#2E8C84]">
          <ReceiptIcon width={23} height={23} />
        </QuickAction>
        <QuickAction href="/products" label="Sản phẩm" bg="bg-[#FFF3E3]" fg="text-[#C25A0B]">
          <BoxIcon width={23} height={23} />
        </QuickAction>
        <QuickAction href="/customers" label="Khách hàng" bg="bg-[#FDECF3]" fg="text-[#B03A70]">
          <PeopleIcon width={23} height={23} />
        </QuickAction>
        <QuickAction href="/expenses" label="Chi" bg="bg-[#E9EEFF]" fg="text-[#3B5BDB]">
          <WalletIcon width={23} height={23} />
        </QuickAction>
      </div>

      <div className="flex items-baseline justify-between pt-1">
        <div className="text-sm font-bold">Đơn gần đây</div>
        <Link href="/orders" className="text-xs text-primary-dark">
          Xem tất cả
        </Link>
      </div>

      <div className="flex flex-col gap-2">
        {data.recentOrders.length === 0 && (
          <div className="rounded-xl border border-line bg-white p-4 text-center text-sm text-muted">
            Chưa có đơn hàng nào.
          </div>
        )}
        {data.recentOrders.map((order) => {
          const itemCount = order.order_items.reduce((sum, i) => sum + i.qty, 0);
          return (
            <div
              key={order.id}
              className="flex items-center justify-between rounded-xl border border-line bg-white px-3.5 py-3"
            >
              <div className="flex flex-col gap-0.5">
                <div className="text-[13px] font-semibold">
                  {order.customers?.name ?? "Khách lẻ"}
                </div>
                <div className="text-[11px] text-muted">
                  {formatOrderTime(order.created_at)} · {itemCount} món
                </div>
              </div>
              <div className="text-sm font-bold">{formatVnd(order.total)}</div>
            </div>
          );
        })}
      </div>

      {/* Temporary: standalone home-screen mode has no address bar, so this
          is the only way to reach /push-test from inside the installed app
          while trying out Web Push. Remove once the trial is done. */}
      <Link href="/push-test" className="pt-2 text-center text-xs text-muted underline">
        [Test] Thử thông báo đẩy
      </Link>
    </div>
  );
}

function HomeSkeleton() {
  return (
    <div className="flex flex-col gap-3 px-4 pb-6 pt-3">
      <Skeleton className="h-[124px] rounded-[18px]" />
      <div className="grid grid-cols-2 gap-2.5">
        <Skeleton className="h-[64px] rounded-[14px]" />
        <Skeleton className="h-[64px] rounded-[14px]" />
      </div>
      <div className="grid grid-cols-5 gap-1.5 rounded-[18px] border border-line bg-white px-2 py-4">
        {Array.from({ length: 5 }, (_, i) => (
          <div key={i} className="flex flex-col items-center gap-1.5">
            <Skeleton className="size-[46px] rounded-[15px]" />
            <Skeleton className="h-3 w-10 rounded" />
          </div>
        ))}
      </div>
      <Skeleton className="h-4 w-28" />
      <div className="flex flex-col gap-2">
        {Array.from({ length: 3 }, (_, i) => (
          <Skeleton key={i} className="h-[54px] rounded-xl" />
        ))}
      </div>
    </div>
  );
}
