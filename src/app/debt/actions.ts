"use server";

import { createClient } from "@/lib/supabase/server";

export type ActionResult = { ok: true } | { error: string };

/**
 * Mirrors collectDebt() from the design prototype — but since debt is
 * derived (see customer_debts view / migration 0001), "collecting" it means
 * flipping every one of the customer's payment_status='debt' orders to
 * 'paid', not resetting a counter. See the comment on customer_debts for
 * the same query.
 */
export async function collectDebt(customerId: string): Promise<ActionResult> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("orders")
    .update({ payment_status: "paid", payment_method: "cash" })
    .eq("customer_id", customerId)
    .eq("payment_status", "debt");

  if (error) return { error: error.message };
  return { ok: true };
}
