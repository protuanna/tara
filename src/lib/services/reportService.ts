import { createClient } from "@/lib/supabase/server";
import {
  vnTodayStartIso,
  daysAgoIso,
  vnDateKey,
  vnDateStartIso,
  vnDateEndExclusiveIso,
} from "@/lib/date";
import type { PaymentMethod } from "@/lib/supabase/types";

export type ReportPeriod = "today" | "7d" | "30d" | "custom" | "all";

const PERIOD_VALUES: ReportPeriod[] = ["today", "7d", "30d", "custom", "all"];
const DATE_KEY_RE = /^\d{4}-\d{2}-\d{2}$/;

export function parseReportPeriod(v: string | null): ReportPeriod {
  return v && PERIOD_VALUES.includes(v as ReportPeriod) ? (v as ReportPeriod) : "7d";
}

type StatsOrderRow = {
  total: number;
  payment_method: PaymentMethod;
  order_items: { name: string; qty: number }[];
};
type BarOrderRow = { created_at: string; total: number };

export type ReportDTO = {
  revenue: number;
  orderCount: number;
  avgOrder: number;
  itemsSold: number;
  totalExpenses: number;
  topProducts: { name: string; qty: number }[];
  bars: { key: string; value: number; label: string }[];
};

export const reportService = {
  async getReport(
    period: ReportPeriod,
    range: { from?: string; to?: string } = {},
  ): Promise<ReportDTO> {
    const supabase = await createClient();

    // Same "counts toward revenue" rule as Home, scoped to the period.
    // "custom" needs both a lower AND upper bound (unlike the presets,
    // which are always "since X ago" through now) — a past date range
    // wouldn't otherwise stop at its own `to` date. "all" has no lower
    // bound at all.
    const statsCutoff: string | null =
      period === "today"
        ? vnTodayStartIso()
        : period === "7d"
          ? daysAgoIso(7)
          : period === "30d"
            ? daysAgoIso(30)
            : period === "all"
              ? null
              : range.from && DATE_KEY_RE.test(range.from)
                ? vnDateStartIso(range.from)
                : daysAgoIso(7);
    const statsUpper =
      period === "custom" && range.to && DATE_KEY_RE.test(range.to)
        ? vnDateEndExclusiveIso(range.to)
        : null;

    // The daily bar chart always shows the last 7 (10 for 30d) VN-calendar
    // days, independent of the period (including "custom") — matches the
    // design; don't try to make the bars "agree" with a custom range.
    const barsWindowDays = period === "30d" ? 10 : 7;
    const barsCutoff = new Date(
      new Date(vnTodayStartIso()).getTime() - (barsWindowDays - 1) * 86_400_000,
    ).toISOString();

    let statsQuery = supabase
      .from("orders")
      .select("total, payment_method, order_items(name, qty)")
      .neq("fulfillment_status", "cancel")
      .neq("payment_status", "unpaid");
    if (statsCutoff) statsQuery = statsQuery.gte("created_at", statsCutoff);
    if (statsUpper) statsQuery = statsQuery.lt("created_at", statsUpper);

    let expensesQuery = supabase.from("expenses").select("amount").is("deleted_at", null);
    if (statsCutoff) expensesQuery = expensesQuery.gte("created_at", statsCutoff);
    if (statsUpper) expensesQuery = expensesQuery.lt("created_at", statsUpper);

    const [
      { data: statsOrders, error: statsErr },
      { data: barOrders, error: barsErr },
      { data: expenseRows, error: expensesErr },
    ] = await Promise.all([
      statsQuery.returns<StatsOrderRow[]>(),
      supabase
        .from("orders")
        .select("created_at, total")
        .gte("created_at", barsCutoff)
        .neq("fulfillment_status", "cancel")
        .neq("payment_status", "unpaid")
        .returns<BarOrderRow[]>(),
      expensesQuery.returns<{ amount: number }[]>(),
    ]);
    if (statsErr) throw statsErr;
    if (barsErr) throw barsErr;
    if (expensesErr) throw expensesErr;

    const totalExpenses = (expenseRows ?? []).reduce((sum, e) => sum + e.amount, 0);

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

    return { revenue, orderCount, avgOrder, itemsSold, totalExpenses, topProducts, bars };
  },
};
