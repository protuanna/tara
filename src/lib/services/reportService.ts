import { createClient } from "@/lib/supabase/server";
import { vnTodayStartIso, daysAgoIso, vnDateKey } from "@/lib/date";
import type { PaymentMethod } from "@/lib/supabase/types";

export type ReportPeriod = "today" | "7d" | "30d";

export function parseReportPeriod(v: string | null): ReportPeriod {
  return v === "today" || v === "30d" ? v : "7d";
}

type StatsOrderRow = {
  total: number;
  payment_method: PaymentMethod;
  order_items: { name: string; qty: number }[];
};
type BarOrderRow = { created_at: string; total: number };

const PAYMENT_DONUT_META: { method: PaymentMethod; label: string; color: string }[] = [
  { method: "cash", label: "Tiền mặt", color: "#8B6FC7" },
  { method: "qr", label: "Chuyển khoản", color: "#6EC7C0" },
  { method: "debt", label: "Ghi nợ", color: "#F0A458" },
];

export type ReportDTO = {
  revenue: number;
  orderCount: number;
  avgOrder: number;
  itemsSold: number;
  topProducts: { name: string; qty: number }[];
  donut: { method: PaymentMethod; label: string; color: string; amount: number; pct: number }[];
  bars: { key: string; value: number; label: string }[];
};

export const reportService = {
  async getReport(period: ReportPeriod): Promise<ReportDTO> {
    const supabase = await createClient();

    // Same "counts toward revenue" rule as Home, scoped to the period.
    const statsCutoff =
      period === "today" ? vnTodayStartIso() : period === "7d" ? daysAgoIso(7) : daysAgoIso(30);

    // The daily bar chart always shows the last 7 (10 for 30d) VN-calendar
    // days, independent of the period — matches the design.
    const barsWindowDays = period === "30d" ? 10 : 7;
    const barsCutoff = new Date(
      new Date(vnTodayStartIso()).getTime() - (barsWindowDays - 1) * 86_400_000,
    ).toISOString();

    const [{ data: statsOrders, error: statsErr }, { data: barOrders, error: barsErr }] =
      await Promise.all([
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
    if (statsErr) throw statsErr;
    if (barsErr) throw barsErr;

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
    const topProducts = [...qtyByProduct.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([name, qty]) => ({ name, qty }));

    const amountByMethod = new Map<PaymentMethod, number>();
    for (const o of orders) {
      amountByMethod.set(o.payment_method, (amountByMethod.get(o.payment_method) ?? 0) + o.total);
    }
    const donutTotal = [...amountByMethod.values()].reduce((a, b) => a + b, 0) || 1;
    const donut = PAYMENT_DONUT_META.map((meta) => {
      const amount = amountByMethod.get(meta.method) ?? 0;
      return { ...meta, amount, pct: Math.round((amount / donutTotal) * 100) };
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

    return { revenue, orderCount, avgOrder, itemsSold, topProducts, donut, bars };
  },
};
