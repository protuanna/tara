"use server";

import { createClient } from "@/lib/supabase/server";
import { WALKIN_CUSTOMER_ID } from "@/lib/supabase/types";

export type OrderActionResult = { ok: true } | { error: string };

export async function cancelOrder(orderId: string): Promise<OrderActionResult> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("orders")
    .update({ fulfillment_status: "cancel" })
    .eq("id", orderId);

  if (error) return { error: error.message };
  return { ok: true };
}

/**
 * Mirrors deliver(paid) from the design prototype:
 * - fulfillment_status -> "done"
 * - paid: payment_status "paid", payment_method "cash"
 * - not paid, real customer (not walk-in): payment_status "debt",
 *   payment_method "debt" — this is what makes them show up in the
 *   customer_debts view, no separate counter to update.
 * - not paid, walk-in customer: payment_status/payment_method "unpaid"
 *   (nobody to collect a debt from later).
 */
export async function deliverOrder(
  orderId: string,
  customerId: string,
  paid: boolean,
): Promise<OrderActionResult> {
  const supabase = await createClient();

  const isDebt = !paid && customerId !== WALKIN_CUSTOMER_ID;

  const { error } = await supabase
    .from("orders")
    .update({
      fulfillment_status: "done",
      payment_status: paid ? "paid" : isDebt ? "debt" : "unpaid",
      payment_method: paid ? "cash" : isDebt ? "debt" : "unpaid",
    })
    .eq("id", orderId);

  if (error) return { error: error.message };
  return { ok: true };
}
