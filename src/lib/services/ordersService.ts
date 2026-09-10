import { createClient } from "@/lib/supabase/server";
import { calcTotals, type DiscountType } from "@/lib/pricing";
import { vnTodayStartIso, daysAgoIso, vnDateStartIso, vnDateEndExclusiveIso } from "@/lib/date";
import { payosService } from "./payosService";
import type { FulfillmentStatus, PaymentStatus, PaymentMethod } from "@/lib/supabase/types";

export type StatusFilter = "all" | FulfillmentStatus;
export type TimeFilter = "all" | "today" | "7d" | "30d" | "custom";
export type PayFilter = "all" | PaymentStatus;

const STATUS_VALUES: FulfillmentStatus[] = ["pending", "processing", "done", "cancel"];
const PAY_VALUES: PaymentStatus[] = ["paid", "debt", "unpaid"];
const TIME_VALUES: TimeFilter[] = ["today", "7d", "30d", "custom"];
const DATE_KEY_RE = /^\d{4}-\d{2}-\d{2}$/;

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
  customers: { name: string; phone: string | null } | null;
  order_items: { qty: number }[];
};

export type StatusCounts = Record<StatusFilter, number>;

export type OrderDetailDTO = {
  id: string;
  created_at: string;
  subtotal: number;
  fee: number;
  topping_fee: number;
  discount_amount: number;
  total: number;
  fulfillment_status: FulfillmentStatus;
  payment_status: PaymentStatus;
  customer_id: string;
  customers: { name: string; phone: string | null } | null;
  order_items: { id: string; product_id: string | null; name: string; price: number; qty: number }[];
  payos_qr_code: string | null;
  payos_checkout_url: string | null;
};

export const ordersService = {
  async list(filters: {
    status: StatusFilter;
    time: TimeFilter;
    pay: PayFilter;
    from?: string;
    to?: string;
    customerId?: string;
  }): Promise<{ orders: OrderListRow[]; statusCounts: StatusCounts }> {
    const supabase = await createClient();

    let query = supabase
      .from("orders")
      .select(
        "id, created_at, total, fulfillment_status, payment_status, payment_method, customer_id, customers(name, phone), order_items(qty)",
      )
      .order("created_at", { ascending: false });

    if (filters.status !== "all") query = query.eq("fulfillment_status", filters.status);
    if (filters.pay !== "all") query = query.eq("payment_status", filters.pay);
    if (filters.customerId) query = query.eq("customer_id", filters.customerId);
    if (filters.time === "today") query = query.gte("created_at", vnTodayStartIso());
    else if (filters.time === "7d") query = query.gte("created_at", daysAgoIso(7));
    else if (filters.time === "30d") query = query.gte("created_at", daysAgoIso(30));
    else if (filters.time === "custom") {
      if (filters.from && DATE_KEY_RE.test(filters.from)) {
        query = query.gte("created_at", vnDateStartIso(filters.from));
      }
      if (filters.to && DATE_KEY_RE.test(filters.to)) {
        query = query.lt("created_at", vnDateEndExclusiveIso(filters.to));
      }
    }

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
        "id, created_at, subtotal, fee, topping_fee, discount_amount, total, fulfillment_status, payment_status, customer_id, customers(name, phone), order_items(id, product_id, name, price, qty), payos_qr_code, payos_checkout_url",
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
    toppingFee: number;
    discount: number;
    discountType: DiscountType;
  }): Promise<{ data: { id: string } } | { error: string }> {
    if (input.items.length === 0) return { error: "Giỏ hàng trống" };

    const subtotal = input.items.reduce((sum, i) => sum + i.price * i.qty, 0);
    const totals = calcTotals(subtotal, input.fee, input.toppingFee, input.discount, input.discountType);

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
        topping_fee: totals.topping,
        discount_amount: totals.discount,
        discount_raw: input.discount,
        discount_type: input.discountType,
        total: totals.total,
      })
      .select("id, payos_order_code")
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

    // Best-effort: every order gets a payOS QR, but payOS being down/
    // misconfigured must never block creating the order itself.
    if (order.payos_order_code !== null) {
      const link = await payosService.createPaymentLink({
        orderCode: order.payos_order_code,
        amount: totals.total,
      });
      if (link) {
        await supabase
          .from("orders")
          .update({
            payos_qr_code: link.qrCode,
            payos_checkout_url: link.checkoutUrl,
            payos_payment_link_id: link.paymentLinkId,
          })
          .eq("id", order.id);
      }
    }

    return { data: { id: order.id } };
  },

  /**
   * "Same shape as checkout but mutates an existing order" (design
   * prototype's startEdit()/saveEdit()) — only allowed while the order is
   * still pending/processing (canDeliver), same guard as cancel/deliver.
   * Replaces order_items wholesale (delete + re-insert) rather than diffing,
   * same non-transactional caveat as create(): if the items insert fails
   * after the order row/old items are already gone, the order is left with
   * no items rather than rolled back.
   */
  async update(
    id: string,
    input: {
      customerId: string;
      items: { productId: string | null; name: string; price: number; qty: number }[];
      fee: number;
      toppingFee: number;
      discount: number;
      discountType: DiscountType;
    },
  ): Promise<{ data: { id: string } } | { error: string }> {
    if (input.items.length === 0) return { error: "Giỏ hàng trống" };

    const supabase = await createClient();

    const { data: existing, error: findError } = await supabase
      .from("orders")
      .select("fulfillment_status, payment_status, total, payos_payment_link_id")
      .eq("id", id)
      .maybeSingle();
    if (findError) throw findError;
    if (!existing) return { error: "Không tìm thấy đơn hàng" };
    if (existing.fulfillment_status !== "pending" && existing.fulfillment_status !== "processing") {
      return { error: "Chỉ có thể sửa đơn khi đang chờ xác nhận hoặc đang xử lý" };
    }

    const subtotal = input.items.reduce((sum, i) => sum + i.price * i.qty, 0);
    const totals = calcTotals(subtotal, input.fee, input.toppingFee, input.discount, input.discountType);

    const { error: updateError } = await supabase
      .from("orders")
      .update({
        customer_id: input.customerId,
        subtotal: totals.subtotal,
        fee: totals.fee,
        topping_fee: totals.topping,
        discount_amount: totals.discount,
        discount_raw: input.discount,
        discount_type: input.discountType,
        total: totals.total,
      })
      .eq("id", id);
    if (updateError) return { error: updateError.message };

    const { error: deleteError } = await supabase.from("order_items").delete().eq("order_id", id);
    if (deleteError) return { error: deleteError.message };

    const { error: itemsError } = await supabase.from("order_items").insert(
      input.items.map((item) => ({
        order_id: id,
        product_id: item.productId,
        name: item.name,
        price: item.price,
        qty: item.qty,
      })),
    );
    if (itemsError) return { error: itemsError.message };

    // Total changed while the order still has an outstanding QR — the old
    // one still encodes the stale amount, and payOS payment links can't be
    // edited in place, so cancel it and mint a replacement. Best-effort,
    // same as create(): a payOS hiccup here must not fail the edit itself.
    if (existing.payment_status === "unpaid" && totals.total !== existing.total) {
      if (existing.payos_payment_link_id) {
        await payosService.cancelPaymentLink(existing.payos_payment_link_id);
      }
      const { data: newOrderCode } = await supabase.rpc("next_payos_order_code");
      if (typeof newOrderCode === "number") {
        const link = await payosService.createPaymentLink({
          orderCode: newOrderCode,
          amount: totals.total,
        });
        await supabase
          .from("orders")
          .update({
            payos_order_code: newOrderCode,
            payos_qr_code: link?.qrCode ?? null,
            payos_checkout_url: link?.checkoutUrl ?? null,
            payos_payment_link_id: link?.paymentLinkId ?? null,
          })
          .eq("id", id);
      }
    }

    return { data: { id } };
  },

  /**
   * An order already `payment_status = "paid"` (only possible here via the
   * payOS webhook firing before the shop delivered — see
   * `markPaidViaWebhook()`) can't be cancelled: the money's already been
   * received, so "cancelling" would silently leave the shop holding a paid
   * order marked as void instead of e.g. a refund, which this app has no
   * flow for. Looked up server-side, never trust a client-side check for
   * this.
   *
   * No `fulfillment_status` guard — a `"done"` order can be cancelled too
   * (e.g. delivered on credit, then the sale falls through and the shop
   * writes it off), not just pending/processing ones. If the order was
   * `payment_status = "debt"`, reset it to `"unpaid"`/`"unpaid"` (the same
   * pair a freshly-created order starts with) so `customer_debts` — which
   * sums `payment_status = 'debt'` with no fulfillment filter — stops
   * counting it; otherwise a cancelled order would still show up as money
   * owed.
   */
  async cancel(id: string): Promise<{ ok: true } | { error: string }> {
    const supabase = await createClient();

    const { data: order, error: findError } = await supabase
      .from("orders")
      .select("payment_status")
      .eq("id", id)
      .maybeSingle();
    if (findError) throw findError;
    if (!order) return { error: "Không tìm thấy đơn hàng" };
    if (order.payment_status === "paid") {
      return { error: "Đơn đã thanh toán online, không thể hủy" };
    }

    const { error } = await supabase
      .from("orders")
      .update(
        order.payment_status === "debt"
          ? { fulfillment_status: "cancel", payment_status: "unpaid", payment_method: "unpaid" }
          : { fulfillment_status: "cancel" },
      )
      .eq("id", id);
    if (error) throw error;

    return { ok: true };
  },

  /**
   * Mirrors deliver(paid) from the design prototype, with one deliberate
   * deviation: the prototype only tracked debt for a real (non-walk-in)
   * customer, since there'd be no one to bill later. Here "pay later"
   * always becomes debt, walk-in included — the shop still gave away goods
   * unpaid and wants that reflected in "Tổng phải thu"/Sổ nợ, even if it
   * can't be attributed to a named person; it lands on the "Khách lẻ" row
   * as one lump sum, collectible the same way as any other customer's debt.
   * - fulfillment_status -> "done"
   * - paid: payment_status "paid", payment_method "cash"
   * - not paid: payment_status/payment_method "debt" — surfaces in
   *   customer_debts automatically (grouped by customer_id, walk-in
   *   included).
   * Looks the order's own customer_id up server-side rather than trusting
   * a client-supplied one (kept even though customer_id no longer changes
   * the outcome, since a future rule might need it again). One more
   * override on top: if the order is already `payment_status = "paid"`
   * (paid online via payOS before the shop delivered — see
   * `markPaidViaWebhook()`), the `paid` argument is ignored entirely and
   * only `fulfillment_status` moves to "done" — there's no "paid or not"
   * choice left to make, and re-running the paid branch would wrongly
   * stomp `payment_method` from `"qr"` back to `"cash"`.
   */
  async deliver(id: string, paid: boolean): Promise<{ ok: true } | { error: string }> {
    const supabase = await createClient();

    const { data: order, error: findError } = await supabase
      .from("orders")
      .select("customer_id, payment_status")
      .eq("id", id)
      .maybeSingle();
    if (findError) throw findError;
    if (!order) return { error: "Không tìm thấy đơn hàng" };

    const { error } = await supabase
      .from("orders")
      .update(
        order.payment_status === "paid"
          ? { fulfillment_status: "done" }
          : {
              fulfillment_status: "done",
              payment_status: paid ? "paid" : "debt",
              payment_method: paid ? "cash" : "debt",
            },
      )
      .eq("id", id);
    if (error) throw error;

    return { ok: true };
  },

  /**
   * Called from the payOS webhook route once its signature has already
   * been verified — never call this from anywhere that hasn't checked the
   * signature first. Unlike `deliver()`, this only touches payment_status/
   * payment_method: a customer can scan and pay the QR before the shop has
   * fulfilled the order (fulfillment_status stays whatever it already
   * was), so payment and fulfillment are independent here. Idempotent by
   * design — payOS retries webhook delivery until it gets a 2xx, so a
   * repeat delivery for an already-paid order is a normal, expected no-op,
   * not an error. Returns `null` for every no-op case (not found, amount
   * mismatch, already paid) so the caller can tell "just paid, go notify
   * someone" apart from "nothing changed, stay quiet" — otherwise a
   * webhook retry would re-fire the paid notification for an order that
   * was already marked paid on the first delivery.
   */
  async markPaidViaWebhook(
    orderCode: number,
    amount: number,
  ): Promise<{ id: string; total: number; customerName: string } | null> {
    const supabase = await createClient();

    const { data: order, error: findError } = await supabase
      .from("orders")
      .select("id, total, payment_status, customers(name)")
      .eq("payos_order_code", orderCode)
      .maybeSingle();
    if (findError) throw findError;
    if (!order) {
      console.error("[ordersService.markPaidViaWebhook] no order for payos_order_code", orderCode);
      return null;
    }
    if (order.payment_status === "paid") return null;
    if (order.total !== amount) {
      console.error(
        "[ordersService.markPaidViaWebhook] amount mismatch for order",
        order.id,
        "expected",
        order.total,
        "got",
        amount,
      );
      return null;
    }

    const { error } = await supabase
      .from("orders")
      .update({ payment_status: "paid", payment_method: "qr" })
      .eq("id", order.id);
    if (error) throw error;

    return { id: order.id, total: order.total, customerName: order.customers?.name ?? "Khách lẻ" };
  },

  /**
   * Collects payment for a single already-delivered order still on debt —
   * the per-order counterpart to `customersService.collectDebt()`, which
   * settles *every* debt order for a customer at once. Only valid for an
   * order that's `fulfillment_status = "done"` (delivered) and
   * `payment_status = "debt"` (delivered-but-unpaid — the only way to
   * reach that combination is `deliver(id, false)`); paying before
   * delivery goes through the payOS QR flow instead
   * (`markPaidViaWebhook()`), not this. `payment_method` becomes `"cash"`
   * — this action means "the shop just collected it in person," same
   * assumption `deliver(id, true)` makes.
   */
  async markPaid(id: string): Promise<{ ok: true } | { error: string }> {
    const supabase = await createClient();

    const { data: order, error: findError } = await supabase
      .from("orders")
      .select("fulfillment_status, payment_status")
      .eq("id", id)
      .maybeSingle();
    if (findError) throw findError;
    if (!order) return { error: "Không tìm thấy đơn hàng" };
    if (order.fulfillment_status !== "done") {
      return { error: "Chỉ có thể thanh toán đơn đã giao" };
    }
    if (order.payment_status !== "debt") {
      return { error: "Đơn này không ở trạng thái ghi nợ" };
    }

    const { error } = await supabase
      .from("orders")
      .update({ payment_status: "paid", payment_method: "cash" })
      .eq("id", id);
    if (error) throw error;

    return { ok: true };
  },
};
