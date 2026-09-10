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
  /**
   * "Doanh thu đã thu" — subset of orderRevenue actually collected, i.e.
   * payment_status = "paid" only (excludes "debt" orders, unlike
   * orderRevenue which counts both paid and debt as revenue).
   */
  collectedRevenue: number;
  /**
   * Công nợ section below the period stats — deliberately NOT period-scoped
   * (unlike every other field here): debt is a running balance ("how much
   * is owed right now"), same semantics as /debt's "Tổng phải thu", not a
   * per-period metric. totalPaidAmount is its all-time counterpart, for
   * comparison against totalDebt.
   */
  totalDebt: number;
  totalPaidAmount: number;
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
      .select("total, payment_status")
      .neq("fulfillment_status", "cancel")
      .neq("payment_status", "unpaid");
    if (statsCutoff) statsQuery = statsQuery.gte("created_at", statsCutoff);
    if (statsUpper) statsQuery = statsQuery.lt("created_at", statsUpper);

    let expensesQuery = supabase.from("expenses").select("amount, type").is("deleted_at", null);
    if (statsCutoff) expensesQuery = expensesQuery.gte("created_at", statsCutoff);
    if (statsUpper) expensesQuery = expensesQuery.lt("created_at", statsUpper);

    // Not period-scoped — see ReportDTO.totalDebt/totalPaidAmount above.
    // "paid"/"debt" orders can never be fulfillment_status = "cancel"
    // (ordersService.cancel() rejects cancelling a paid order outright, and
    // resets a debt order's payment_status back to "unpaid" before
    // cancelling it), so no extra status filter is needed here.
    const debtPaidQuery = supabase
      .from("orders")
      .select("total, payment_status")
      .in("payment_status", ["debt", "paid"]);

    const [
      { data: statsOrders, error: statsErr },
      { data: expenseRows, error: expensesErr },
      { data: debtPaidOrders, error: debtPaidErr },
    ] = await Promise.all([
      statsQuery.returns<{ total: number; payment_status: string }[]>(),
      expensesQuery.returns<{ amount: number; type: CashEntryType }[]>(),
      debtPaidQuery.returns<{ total: number; payment_status: string }[]>(),
    ]);
    if (statsErr) throw statsErr;
    if (expensesErr) throw expensesErr;
    if (debtPaidErr) throw debtPaidErr;

    const orderRevenue = (statsOrders ?? []).reduce((sum, o) => sum + o.total, 0);
    const collectedRevenue = (statsOrders ?? [])
      .filter((o) => o.payment_status === "paid")
      .reduce((sum, o) => sum + o.total, 0);
    const totalIncome = (expenseRows ?? [])
      .filter((e) => e.type === "thu")
      .reduce((sum, e) => sum + e.amount, 0);
    const totalExpenses = (expenseRows ?? [])
      .filter((e) => e.type === "chi")
      .reduce((sum, e) => sum + e.amount, 0);
    const totalDebt = (debtPaidOrders ?? [])
      .filter((o) => o.payment_status === "debt")
      .reduce((sum, o) => sum + o.total, 0);
    const totalPaidAmount = (debtPaidOrders ?? [])
      .filter((o) => o.payment_status === "paid")
      .reduce((sum, o) => sum + o.total, 0);

    // "Doanh thu kỳ này" = order revenue + manual income - manual expense,
    // a deliberate change from the order-only figure Home's revenue card
    // still uses — see CLAUDE.md "Thu Chi" section for why the two diverge.
    const revenue = orderRevenue + totalIncome - totalExpenses;

    return {
      revenue,
      orderRevenue,
      totalIncome,
      totalExpenses,
      collectedRevenue,
      totalDebt,
      totalPaidAmount,
    };
  },
};
