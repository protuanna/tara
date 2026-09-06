import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { formatVnd } from "@/lib/format";
import { formatOrderTime, vnTodayStartIso } from "@/lib/date";
import { QuickAction } from "@/components/quick-action";
import { CartIcon, ReceiptIcon, BoxIcon, PeopleIcon } from "@/components/icons";
import type { PaymentStatus } from "@/lib/supabase/types";

// Dashboard numbers must reflect live data, not a static build-time snapshot.
export const dynamic = "force-dynamic";

type RecentOrderRow = {
  id: string;
  created_at: string;
  total: number;
  customers: { name: string } | null;
  order_items: { qty: number }[];
};

type TodayOrderRow = {
  total: number;
  payment_status: PaymentStatus;
};

export default async function HomePage() {
  const supabase = await createClient();
  const todayStart = vnTodayStartIso();

  const [recentOrdersRes, todayOrdersRes, debtsRes] = await Promise.all([
    supabase
      .from("orders")
      .select("id, created_at, total, customers(name), order_items(qty)")
      .order("created_at", { ascending: false })
      .limit(3)
      .returns<RecentOrderRow[]>(),
    supabase
      .from("orders")
      .select("total, payment_status")
      .gte("created_at", todayStart)
      .neq("fulfillment_status", "cancel")
      .returns<TodayOrderRow[]>(),
    supabase.from("customer_debts").select("debt").gt("debt", 0),
  ]);

  const recentOrders = recentOrdersRes.data ?? [];
  const todayOrders = todayOrdersRes.data ?? [];
  const debts = debtsRes.data ?? [];

  const todayOrdersCount = todayOrders.length;
  // Matches the design's revenue rule (fulfillment not cancelled, payment
  // not unpaid) — see docs/design/tara-shop-prototype-logic.js — scoped to
  // today, since that's what the card actually labels itself as.
  const todayRevenue = todayOrders
    .filter((o) => o.payment_status !== "unpaid")
    .reduce((sum, o) => sum + o.total, 0);

  const debtorCount = debts.length;
  const totalDebt = debts.reduce((sum, d) => sum + (d.debt ?? 0), 0);

  return (
    <div className="flex flex-col gap-3 px-4 pb-6 pt-3">
      <div className="flex flex-col gap-1.5 rounded-[18px] bg-gradient-to-br from-primary to-primary-dark p-5 text-white">
        <div className="text-sm font-bold opacity-95">Tara&apos;Shop</div>
        <div className="text-[13px] opacity-85">Doanh thu hôm nay</div>
        <div className="text-3xl font-extrabold">{formatVnd(todayRevenue)}</div>
        <div className="text-[13px] opacity-85">{todayOrdersCount} đơn đã bán</div>
      </div>

      <div className="grid grid-cols-2 gap-2.5">
        <div className="flex flex-col gap-1 rounded-[14px] border border-line bg-white p-3.5">
          <div className="text-xs text-muted">Khách còn nợ</div>
          <div className="text-xl font-bold">{debtorCount}</div>
        </div>
        <div className="flex flex-col gap-1 rounded-[14px] border border-line bg-white p-3.5">
          <div className="text-xs text-muted">Tổng phải thu</div>
          <div className="text-xl font-bold text-unpaid">{formatVnd(totalDebt)}</div>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-1.5 rounded-[18px] border border-line bg-white px-2 py-4">
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
      </div>

      <div className="flex items-baseline justify-between pt-1">
        <div className="text-sm font-bold">Đơn gần đây</div>
        <Link href="/orders" className="text-xs text-primary-dark">
          Xem tất cả
        </Link>
      </div>

      <div className="flex flex-col gap-2">
        {recentOrders.length === 0 && (
          <div className="rounded-xl border border-line bg-white p-4 text-center text-sm text-muted">
            Chưa có đơn hàng nào.
          </div>
        )}
        {recentOrders.map((order) => {
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
    </div>
  );
}
