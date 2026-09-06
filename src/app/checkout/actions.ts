"use server";

import { createClient } from "@/lib/supabase/server";
import { calcTotals, type DiscountType } from "@/lib/pricing";

export type CreateOrderInput = {
  customerId: string;
  items: { productId: string; name: string; price: number; qty: number }[];
  fee: number;
  discount: number;
  discountType: DiscountType;
};

export type CreateOrderResult = { orderId: string } | { error: string };

/**
 * Recomputes totals server-side from the raw line items/fee/discount — never
 * trust a client-submitted total. Inserts the order, then its line items;
 * supabase-js has no multi-statement transaction, so on item-insert failure
 * we best-effort delete the just-created order rather than leaving an empty
 * one behind (a `create_order` Postgres RPC would make this atomic, if that
 * ever becomes worth the complexity).
 */
export async function createOrder(input: CreateOrderInput): Promise<CreateOrderResult> {
  if (input.items.length === 0) {
    return { error: "Giỏ hàng trống" };
  }

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

  if (orderError || !order) {
    return { error: orderError?.message ?? "Không thể tạo đơn hàng" };
  }

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

  return { orderId: order.id };
}

export type CreateCustomerResult =
  | { customer: { id: string; name: string; phone: string | null } }
  | { error: string };

export async function createCustomer(input: {
  name: string;
  phone: string | null;
}): Promise<CreateCustomerResult> {
  const name = input.name.trim();
  if (!name) return { error: "Vui lòng nhập tên khách hàng" };

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("customers")
    .insert({ name, phone: input.phone?.trim() || null })
    .select("id, name, phone")
    .single();

  if (error || !data) {
    return { error: error?.message ?? "Không thể thêm khách hàng" };
  }

  return { customer: data };
}
