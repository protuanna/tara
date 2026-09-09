import { createClient } from "@/lib/supabase/server";
import { vnTodayStartIso, daysAgoIso, vnDateStartIso, vnDateEndExclusiveIso } from "@/lib/date";
import type { CashEntryType } from "@/lib/supabase/types";

export type ReportPeriod = "today" | "7d" | "30d" | "custom" | "all";

const PERIOD_VALUES: ReportPeriod[] = ["today", "7d", "30d", "custom", "all"];
const DATE_KEY_RE = /^\d{4}-\d{2}-\d{2}$/;

export function parseReportPeriod(v: string | null): ReportPeriod {
  return v && PERIOD_VALUES.includes(v as ReportPeriod) ? (v as ReportPeriod) : "7d";
}

export type ReportDTO = {
  /** orders' revenue + "thu" (income) - "chi" (expense) for the period. */
  revenue: number;
  /** "Tổng tiền hàng" — sum of orders.total alone, before thu/chi. */
  orderRevenue: number;
  totalIncome: number;
  totalExpenses: number;
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

    let statsQuery = supabase
      .from("orders")
      .select("total")
      .neq("fulfillment_status", "cancel")
      .neq("payment_status", "unpaid");
    if (statsCutoff) statsQuery = statsQuery.gte("created_at", statsCutoff);
    if (statsUpper) statsQuery = statsQuery.lt("created_at", statsUpper);

    let expensesQuery = supabase.from("expenses").select("amount, type").is("deleted_at", null);
    if (statsCutoff) expensesQuery = expensesQuery.gte("created_at", statsCutoff);
    if (statsUpper) expensesQuery = expensesQuery.lt("created_at", statsUpper);

    const [
      { data: statsOrders, error: statsErr },
      { data: expenseRows, error: expensesErr },
    ] = await Promise.all([
      statsQuery.returns<{ total: number }[]>(),
      expensesQuery.returns<{ amount: number; type: CashEntryType }[]>(),
    ]);
    if (statsErr) throw statsErr;
    if (expensesErr) throw expensesErr;

    const orderRevenue = (statsOrders ?? []).reduce((sum, o) => sum + o.total, 0);
    const totalIncome = (expenseRows ?? [])
      .filter((e) => e.type === "thu")
      .reduce((sum, e) => sum + e.amount, 0);
    const totalExpenses = (expenseRows ?? [])
      .filter((e) => e.type === "chi")
      .reduce((sum, e) => sum + e.amount, 0);

    // "Doanh thu kỳ này" = order revenue + manual income - manual expense,
    // a deliberate change from the order-only figure Home's revenue card
    // still uses — see CLAUDE.md "Thu Chi" section for why the two diverge.
    const revenue = orderRevenue + totalIncome - totalExpenses;

    return { revenue, orderRevenue, totalIncome, totalExpenses };
  },
};
