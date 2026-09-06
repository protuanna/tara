import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { formatVnd } from "@/lib/format";
import { vnTodayStartIso, daysAgoIso, vnDateKey } from "@/lib/date";
import type { PaymentMethod } from "@/lib/supabase/types";

export const dynamic = "force-dynamic";

type Period = "today" | "7d" | "30d";

function parsePeriod(v: string | undefined): Period {
  return v === "today" || v === "30d" ? v : "7d";
}

type StatsOrderRow = {
  total: number;
  payment_method: PaymentMethod;
  order_items: { name: string; qty: number }[];
};

type BarOrderRow = { created_at: string; total: number };

const PERIOD_TABS: { value: Period; label: string }[] = [
  { value: "today", label: "Hôm nay" },
  { value: "7d", label: "7 ngày" },
  { value: "30d", label: "30 ngày" },
];

const PAYMENT_DONUT_META: { method: PaymentMethod; label: string; color: string }[] = [
  { method: "cash", label: "Tiền mặt", color: "#8B6FC7" },
  { method: "qr", label: "Chuyển khoản", color: "#6EC7C0" },
  { method: "debt", label: "Ghi nợ", color: "#F0A458" },
];

function periodUrl(p: Period): string {
  return p === "7d" ? "/report" : `/report?period=${p}`;
}

export default async function ReportPage({
  searchParams,
}: {
  searchParams: Promise<{ period?: string }>;
}) {
  const sp = await searchParams;
  const period = parsePeriod(sp.period);

  const supabase = await createClient();

  // Same "counts toward revenue" rule as Home (fulfillment not cancelled,
  // payment not unpaid), scoped to the selected period.
  const statsCutoff =
    period === "today" ? vnTodayStartIso() : period === "7d" ? daysAgoIso(7) : daysAgoIso(30);

  // The daily bar chart always shows the last 7 (or 10, for the 30d period)
  // VN-calendar-days, independent of the period tab — matches the design.
  const barsWindowDays = period === "30d" ? 10 : 7;
  const barsCutoff = new Date(
    new Date(vnTodayStartIso()).getTime() - (barsWindowDays - 1) * 86_400_000,
  ).toISOString();

  const [{ data: statsOrders }, { data: barOrders }] = await Promise.all([
    supabase
      .from("orders")
      .select("total, payment_method, order_items(name, qty)")
      .gte("created_at", statsCutoff)
      .neq("fulfillment_status", "cancel")
      .neq("payment_status", "unpaid")
      .returns<StatsOrderRow[]>(),
    supabase
      .from("orders")
      .select("created_at, total")
      .gte("created_at", barsCutoff)
      .neq("fulfillment_status", "cancel")
      .neq("payment_status", "unpaid")
      .returns<BarOrderRow[]>(),
  ]);

  const orders = statsOrders ?? [];
  const revenue = orders.reduce((sum, o) => sum + o.total, 0);
  const orderCount = orders.length;
  const avgOrder = orderCount ? Math.round(revenue / orderCount) : 0;
  const itemsSold = orders.reduce(
    (sum, o) => sum + o.order_items.reduce((s, i) => s + i.qty, 0),
    0,
  );

  const qtyByProduct = new Map<string, number>();
  for (const o of orders) {
    for (const item of o.order_items) {
      qtyByProduct.set(item.name, (qtyByProduct.get(item.name) ?? 0) + item.qty);
    }
  }
  const topProducts = [...qtyByProduct.entries()].sort((a, b) => b[1] - a[1]).slice(0, 3);
  const maxQty = topProducts[0]?.[1] ?? 1;

  const amountByMethod = new Map<PaymentMethod, number>();
  for (const o of orders) {
    amountByMethod.set(o.payment_method, (amountByMethod.get(o.payment_method) ?? 0) + o.total);
  }
  const donutTotal = [...amountByMethod.values()].reduce((a, b) => a + b, 0) || 1;
  const CIRC = 2 * Math.PI * 36;
  let acc = 0;
  const donut = PAYMENT_DONUT_META.map((meta) => {
    const amount = amountByMethod.get(meta.method) ?? 0;
    const frac = amount / donutTotal;
    const seg = {
      ...meta,
      amount,
      pctText: `${Math.round(frac * 100)}%`,
      dash: `${(frac * CIRC).toFixed(1)} ${CIRC.toFixed(1)}`,
      offset: (-acc * CIRC).toFixed(1),
    };
    acc += frac;
    return seg;
  }).filter((d) => d.amount > 0);

  const dayBuckets = new Map<string, number>();
  for (const o of barOrders ?? []) {
    const key = vnDateKey(new Date(o.created_at));
    dayBuckets.set(key, (dayBuckets.get(key) ?? 0) + o.total);
  }
  const now = new Date();
  const bars = Array.from({ length: barsWindowDays }, (_, i) => {
    const daysBack = barsWindowDays - 1 - i;
    const key = vnDateKey(new Date(now.getTime() - daysBack * 86_400_000));
    return {
      key,
      value: dayBuckets.get(key) ?? 0,
      label: daysBack === 0 ? "Nay" : daysBack === 1 ? "Qua" : `-${daysBack}d`,
    };
  });
  const maxBar = Math.max(...bars.map((b) => b.value), 1);

  return (
    <div className="flex flex-col gap-3.5 px-4 pb-6 pt-3">
      <div className="flex gap-1 rounded-[22px] bg-page p-1">
        {PERIOD_TABS.map((tab) => (
          <Link
            key={tab.value}
            href={periodUrl(tab.value)}
            className={`flex-1 rounded-[18px] py-2 text-center text-[12.5px] font-semibold ${
              tab.value === period ? "bg-white text-primary-dark shadow" : "text-muted"
            }`}
          >
            {tab.label}
          </Link>
        ))}
      </div>

      <div className="flex flex-col gap-4 rounded-[20px] bg-gradient-to-br from-primary to-primary-dark p-4 text-white">
        <div className="flex flex-col gap-0.5">
          <div className="text-[12.5px] opacity-85">Doanh thu kỳ này</div>
          <div className="text-[29px] font-extrabold tracking-tight">{formatVnd(revenue)}</div>
        </div>
        <div className="flex h-[112px] items-end gap-1.5">
          {bars.map((bar) => (
            <div key={bar.key} className="flex flex-1 flex-col items-center gap-1.5">
              <div className="h-[13px] text-[10.5px] font-semibold opacity-95">
                {bar.value > 0 ? `${Math.round(bar.value / 1000)}k` : ""}
              </div>
              <div
                className={`w-full rounded-t-lg rounded-b-[3px] ${
                  bar.label === "Nay" ? "bg-white" : "bg-white/55"
                }`}
                style={{ height: `${Math.max(6, Math.round((bar.value / maxBar) * 96))}px` }}
              />
              <div className="text-[10.5px] opacity-90">{bar.label}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2">
        <div className="flex flex-col gap-0.5 rounded-2xl border border-line bg-white p-3">
          <div className="text-[11px] text-muted">Số đơn</div>
          <div className="text-base font-extrabold">{orderCount}</div>
        </div>
        <div className="flex flex-col gap-0.5 rounded-2xl border border-line bg-white p-3">
          <div className="text-[11px] text-muted">TB/đơn</div>
          <div className="text-sm font-extrabold">{formatVnd(avgOrder)}</div>
        </div>
        <div className="flex flex-col gap-0.5 rounded-2xl border border-line bg-white p-3">
          <div className="text-[11px] text-muted">Món đã bán</div>
          <div className="text-base font-extrabold">{itemsSold}</div>
        </div>
      </div>

      <div className="flex flex-col gap-3 rounded-[18px] border border-line bg-white p-4">
        <div className="text-sm font-bold">Bán chạy nhất</div>
        {topProducts.length === 0 && (
          <p className="text-xs text-muted">Chưa có dữ liệu bán hàng trong kỳ này.</p>
        )}
        {topProducts.map(([name, qty], i) => (
          <div key={name} className="flex items-center gap-3">
            <div className="flex size-[34px] flex-none items-center justify-center rounded-xl bg-primary-tint text-[13px] font-extrabold text-primary-dark">
              {i + 1}
            </div>
            <div className="flex min-w-0 flex-1 flex-col gap-1">
              <div className="flex justify-between gap-2">
                <span className="truncate text-[13px] font-semibold">{name}</span>
                <span className="flex-none text-xs text-muted">{qty} phần</span>
              </div>
              <div className="h-1.5 overflow-hidden rounded-full bg-page">
                <div
                  className="h-full rounded-full bg-primary"
                  style={{ width: `${Math.round((qty / maxQty) * 100)}%` }}
                />
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="flex flex-col gap-3.5 rounded-[18px] border border-line bg-white p-4">
        <div className="text-sm font-bold">Cơ cấu thanh toán</div>
        {donut.length === 0 ? (
          <p className="text-xs text-muted">Chưa có dữ liệu thanh toán trong kỳ này.</p>
        ) : (
          <div className="flex items-center gap-4">
            <svg width={96} height={96} viewBox="0 0 96 96" className="flex-none -rotate-90">
              <circle cx="48" cy="48" r="36" fill="none" stroke="#EDEDF2" strokeWidth="14" />
              {donut.map((d) => (
                <circle
                  key={d.method}
                  cx="48"
                  cy="48"
                  r="36"
                  fill="none"
                  stroke={d.color}
                  strokeWidth="14"
                  strokeDasharray={d.dash}
                  strokeDashoffset={d.offset}
                />
              ))}
            </svg>
            <div className="flex min-w-0 flex-1 flex-col gap-2">
              {donut.map((d) => (
                <div key={d.method} className="flex items-center gap-2">
                  <div className="size-2.5 flex-none rounded-sm" style={{ background: d.color }} />
                  <div className="flex-1 text-[12.5px] font-semibold">{d.label}</div>
                  <div className="flex-none text-xs text-muted">{d.pctText}</div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
