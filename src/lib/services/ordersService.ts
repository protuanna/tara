import { createClient } from "@/lib/supabase/server";
import { calcTotals, type DiscountType } from "@/lib/pricing";
import { vnTodayStartIso, daysAgoIso } from "@/lib/date";
import { WALKIN_CUSTOMER_ID } from "@/lib/supabase/types";
import type { FulfillmentStatus, PaymentStatus, PaymentMethod } from "@/lib/supabase/types";

export type StatusFilter = "all" | FulfillmentStatus;
export type TimeFilter = "all" | "today" | "7d" | "30d";
export type PayFilter = "all" | PaymentStatus;

const STATUS_VALUES: FulfillmentStatus[] = ["pending", "processing", "done", "cancel"];
const PAY_VALUES: PaymentStatus[] = ["paid", "debt", "unpaid"];
const TIME_VALUES: TimeFilter[] = ["today", "7d", "30d"];

export function parseStatusFilter(v: string | null): StatusFilter {
  return v && STATUS_VALUES.includes(v as FulfillmentStatus) ? (v as FulfillmentStatus) : "all";
}
export function parseTimeFilter(v: string | null): TimeFilter {
  return v && TIME_VALUES.includes(v as TimeFilter) ? (v as TimeFilter) : "all";
}
export function parsePayFilter(v: string | null): PayFilter {
  return v && PAY_VALUES.includes(v as PaymentStatus) ? (v as PaymentStatus) : "all";
}

export type OrderListRow = {
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

export type OrderDetailDTO = {
  id: string;
  created_at: string;
  subtotal: number;
  fee: number;
  discount_amount: number;
  total: number;
  fulfillment_status: FulfillmentStatus;
  payment_status: PaymentStatus;
  customer_id: string;
  customers: { name: string } | null;
  order_items: { id: string; name: string; price: number; qty: number }[];
};

export const ordersService = {
  async list(filters: {
    status: StatusFilter;
    time: TimeFilter;
    pay: PayFilter;
  }): Promise<{ orders: OrderListRow[]; statusCounts: StatusCounts }> {
    const supabase = await createClient();

    let query = supabase
      .from("orders")
      .select(
        "id, created_at, total, fulfillment_status, payment_status, payment_method, customer_id, customers(name), order_items(qty)",
      )
      .order("created_at", { ascending: false });

    if (filters.status !== "all") query = query.eq("fulfillment_status", filters.status);
    if (filters.pay !== "all") query = query.eq("payment_status", filters.pay);
    if (filters.time === "today") query = query.gte("created_at", vnTodayStartIso());
    else if (filters.time === "7d") query = query.gte("created_at", daysAgoIso(7));
    else if (filters.time === "30d") query = query.gte("created_at", daysAgoIso(30));

    const [{ data: orders, error: ordersErr }, { data: allStatuses, error: statusErr }] =
      await Promise.all([
        query.returns<OrderListRow[]>(),
        supabase
          .from("orders")
          .select("fulfillment_status")
          .returns<{ fulfillment_status: FulfillmentStatus }[]>(),
      ]);
    if (ordersErr) throw ordersErr;
    if (statusErr) throw statusErr;

    // Counts are always across ALL orders (unfiltered by time/pay), just by
    // fulfillment status — matches the design's tab-count behavior.
    const statusCounts: StatusCounts = { all: allStatuses?.length ?? 0, pending: 0, processing: 0, done: 0, cancel: 0 };
    for (const row of allStatuses ?? []) statusCounts[row.fulfillment_status] += 1;

    return { orders: orders ?? [], statusCounts };
  },

  async getById(id: string): Promise<OrderDetailDTO | null> {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("orders")
      .select(
        "id, created_at, subtotal, fee, discount_amount, total, fulfillment_status, payment_status, customer_id, customers(name), order_items(id, name, price, qty)",
      )
      .eq("id", id)
      .returns<OrderDetailDTO[]>()
      .maybeSingle();
    if (error) throw error;
    return data;
  },

  /**
   * Recomputes totals server-side from the raw line items/fee/discount —
   * never trust a client-submitted total. Not transactional: inserts the
   * order then its order_items, and best-effort deletes the order if the
   * items insert fails (supabase-js has no multi-statement transaction; a
   * `create_order` Postgres RPC would make this atomic if that ever matters).
   */
  async create(input: {
    customerId: string;
    items: { productId: string; name: string; price: number; qty: number }[];
    fee: number;
    discount: number;
    discountType: DiscountType;
  }): Promise<{ data: { id: string } } | { error: string }> {
    if (input.items.length === 0) return { error: "Giỏ hàng trống" };

    const subtotal = input.items.reduce((sum, i) => sum + i.price * i.qty, 0);
    const totals = calcTotals(subtotal, input.fee, input.discount, input.discountType);

    const supabase = await createClient();

    const { data: order, error: orderError } = await supabase
      .from("orders")
      .insert({
        customer_id: input.customerId,
        // New orders start "processing", not the pending column default —
        // matches saveOrder() in the design prototype.
        fulfillment_status: "processing",
        payment_status: "unpaid",
        payment_method: "unpaid",
        subtotal: totals.subtotal,
        fee: totals.fee,
        discount_amount: totals.discount,
        discount_raw: input.discount,
        discount_type: input.discountType,
        total: totals.total,
      })
      .select("id")
      .single();

    if (orderError || !order) return { error: orderError?.message ?? "Không thể tạo đơn hàng" };

    const { error: itemsError } = await supabase.from("order_items").insert(
      input.items.map((item) => ({
        order_id: order.id,
        product_id: item.productId,
        name: item.name,
        price: item.price,
        qty: item.qty,
      })),
    );

    if (itemsError) {
      await supabase.from("orders").delete().eq("id", order.id);
      return { error: itemsError.message };
    }

    return { data: { id: order.id } };
  },

  async cancel(id: string): Promise<void> {
    const supabase = await createClient();
    const { error } = await supabase
      .from("orders")
      .update({ fulfillment_status: "cancel" })
      .eq("id", id);
    if (error) throw error;
  },

  /**
   * Mirrors deliver(paid) from the design prototype:
   * - fulfillment_status -> "done"
   * - paid: payment_status "paid", payment_method "cash"
   * - not paid, real customer (not walk-in): payment_status "debt",
   *   payment_method "debt" — surfaces in customer_debts automatically.
   * - not paid, walk-in customer: payment_status/payment_method "unpaid".
   * Looks the order's own customer_id up server-side rather than trusting
   * a client-supplied one.
   */
  async deliver(id: string, paid: boolean): Promise<{ ok: true } | { error: string }> {
    const supabase = await createClient();

    const { data: order, error: findError } = await supabase
      .from("orders")
      .select("customer_id")
      .eq("id", id)
      .maybeSingle();
    if (findError) throw findError;
    if (!order) return { error: "Không tìm thấy đơn hàng" };

    const isDebt = !paid && order.customer_id !== WALKIN_CUSTOMER_ID;

    const { error } = await supabase
      .from("orders")
      .update({
        fulfillment_status: "done",
        payment_status: paid ? "paid" : isDebt ? "debt" : "unpaid",
        payment_method: paid ? "cash" : isDebt ? "debt" : "unpaid",
      })
      .eq("id", id);
    if (error) throw error;

    return { ok: true };
  },
};
