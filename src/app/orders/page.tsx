import { createClient } from "@/lib/supabase/server";
import { vnTodayStartIso, daysAgoIso } from "@/lib/date";
import { OrdersScreen } from "./orders-screen";
import type { FulfillmentStatus, PaymentStatus, PaymentMethod } from "@/lib/supabase/types";

export const dynamic = "force-dynamic";

export type StatusFilter = "all" | FulfillmentStatus;
export type TimeFilter = "all" | "today" | "7d" | "30d";
export type PayFilter = "all" | PaymentStatus;

const STATUS_VALUES: FulfillmentStatus[] = ["pending", "processing", "done", "cancel"];
const PAY_VALUES: PaymentStatus[] = ["paid", "debt", "unpaid"];
const TIME_VALUES: TimeFilter[] = ["today", "7d", "30d"];

function parseStatus(v: string | undefined): StatusFilter {
  return v && STATUS_VALUES.includes(v as FulfillmentStatus) ? (v as FulfillmentStatus) : "all";
}
function parseTime(v: string | undefined): TimeFilter {
  return v && TIME_VALUES.includes(v as TimeFilter) ? (v as TimeFilter) : "all";
}
function parsePay(v: string | undefined): PayFilter {
  return v && PAY_VALUES.includes(v as PaymentStatus) ? (v as PaymentStatus) : "all";
}

export type OrderRow = {
  id: string;
  created_at: string;
  total: number;
  fulfillment_status: FulfillmentStatus;
  payment_status: PaymentStatus;
  payment_method: PaymentMethod;
  customer_id: string;
  customers: { name: string } | null;
  order_items: { qty: number }[];
};

export type StatusCounts = Record<StatusFilter, number>;

export default async function OrdersPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; time?: string; pay?: string }>;
}) {
  const sp = await searchParams;
  const status = parseStatus(sp.status);
  const time = parseTime(sp.time);
  const pay = parsePay(sp.pay);

  const supabase = await createClient();

  let query = supabase
    .from("orders")
    .select(
      "id, created_at, total, fulfillment_status, payment_status, payment_method, customer_id, customers(name), order_items(qty)",
    )
    .order("created_at", { ascending: false });

  if (status !== "all") query = query.eq("fulfillment_status", status);
  if (pay !== "all") query = query.eq("payment_status", pay);
  if (time === "today") query = query.gte("created_at", vnTodayStartIso());
  else if (time === "7d") query = query.gte("created_at", daysAgoIso(7));
  else if (time === "30d") query = query.gte("created_at", daysAgoIso(30));

  const [{ data: orders }, { data: allStatuses }] = await Promise.all([
    query.returns<OrderRow[]>(),
    supabase
      .from("orders")
      .select("fulfillment_status")
      .returns<{ fulfillment_status: FulfillmentStatus }[]>(),
  ]);

  // Counts are always across ALL orders (unfiltered by time/pay), just by
  // fulfillment status — matches the design's tab-count behavior.
  const statusCounts: StatusCounts = {
    all: allStatuses?.length ?? 0,
    pending: 0,
    processing: 0,
    done: 0,
    cancel: 0,
  };
  for (const row of allStatuses ?? []) {
    statusCounts[row.fulfillment_status] += 1;
  }

  return (
    <OrdersScreen
      orders={orders ?? []}
      statusCounts={statusCounts}
      activeStatus={status}
      activeTime={time}
      activePay={pay}
    />
  );
}
