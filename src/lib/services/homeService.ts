import { createClient } from "@/lib/supabase/server";
import { vnTodayStartIso } from "@/lib/date";
import type { PaymentStatus } from "@/lib/supabase/types";

export type RecentOrderDTO = {
  id: string;
  created_at: string;
  total: number;
  customers: { name: string } | null;
  order_items: { qty: number }[];
};

type TodayOrderRow = { total: number; payment_status: PaymentStatus };

export type DashboardDTO = {
  todayRevenue: number;
  todayOrdersCount: number;
  debtorCount: number;
  totalDebt: number;
  recentOrders: RecentOrderDTO[];
};

export const homeService = {
  async getDashboard(): Promise<DashboardDTO> {
    const supabase = await createClient();
    const todayStart = vnTodayStartIso();

    const [recentOrdersRes, todayOrdersRes, debtsRes] = await Promise.all([
      supabase
        .from("orders")
        .select("id, created_at, total, customers(name), order_items(qty)")
        .order("created_at", { ascending: false })
        .limit(3)
        .returns<RecentOrderDTO[]>(),
      supabase
        .from("orders")
        .select("total, payment_status")
        .gte("created_at", todayStart)
        .neq("fulfillment_status", "cancel")
        .returns<TodayOrderRow[]>(),
      supabase.from("customer_debts").select("debt").gt("debt", 0),
    ]);

    if (recentOrdersRes.error) throw recentOrdersRes.error;
    if (todayOrdersRes.error) throw todayOrdersRes.error;
    if (debtsRes.error) throw debtsRes.error;

    const todayOrders = todayOrdersRes.data ?? [];
    const debts = debtsRes.data ?? [];

    // Matches the revenue rule used everywhere: fulfillment not cancelled
    // (query-level), payment not unpaid.
    const todayRevenue = todayOrders
      .filter((o) => o.payment_status !== "unpaid")
      .reduce((sum, o) => sum + o.total, 0);

    return {
      todayRevenue,
      todayOrdersCount: todayOrders.length,
      debtorCount: debts.length,
      totalDebt: debts.reduce((sum, d) => sum + (d.debt ?? 0), 0),
      recentOrders: recentOrdersRes.data ?? [],
    };
  },
};
