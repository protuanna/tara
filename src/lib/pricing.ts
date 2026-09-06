import type { DiscountType } from "@/lib/supabase/types";

export type { DiscountType };

export interface PricingTotals {
  subtotal: number;
  fee: number;
  discount: number;
  total: number;
}

/**
 * grandTotal = subtotal + fee - discount
 * discount = pct ? round(subtotal * min(pct,100) / 100) : min(vnd, subtotal + fee)
 * Ported from docs/design/tara-shop-prototype-logic.js (`calcTotals`) — keep
 * in sync if that rule ever changes. Always recompute this server-side
 * before writing an order; never trust a client-submitted total.
 */
export function calcTotals(
  subtotal: number,
  feeInput: number,
  discountInput: number,
  discountType: DiscountType,
): PricingTotals {
  const fee = Math.max(0, Math.round(feeInput) || 0);
  const rawDiscount = Math.max(0, Math.round(discountInput) || 0);
  const discount =
    discountType === "pct"
      ? Math.round((subtotal * Math.min(rawDiscount, 100)) / 100)
      : Math.min(rawDiscount, subtotal + fee);
  const total = Math.max(0, subtotal + fee - discount);
  return { subtotal, fee, discount, total };
}
