import type { DiscountType } from "@/lib/supabase/types";

export type { DiscountType };

export interface PricingTotals {
  subtotal: number;
  fee: number;
  topping: number;
  discount: number;
  total: number;
}

/**
 * grandTotal = subtotal + fee + topping - discount
 * discount = pct ? round(subtotal * min(pct,100) / 100) : min(vnd, subtotal + fee + topping)
 * Ported from docs/design/tara-shop-prototype-logic.js (`calcTotals`), with
 * "topping" added as an app-specific extension of the same shape as `fee`
 * (a flat surcharge on top of subtotal) — keep the fee/discount half in
 * sync with the prototype if that rule ever changes. Always recompute this
 * server-side before writing an order; never trust a client-submitted total.
 */
export function calcTotals(
  subtotal: number,
  feeInput: number,
  toppingInput: number,
  discountInput: number,
  discountType: DiscountType,
): PricingTotals {
  const fee = Math.max(0, Math.round(feeInput) || 0);
  const topping = Math.max(0, Math.round(toppingInput) || 0);
  const rawDiscount = Math.max(0, Math.round(discountInput) || 0);
  const discount =
    discountType === "pct"
      ? Math.round((subtotal * Math.min(rawDiscount, 100)) / 100)
      : Math.min(rawDiscount, subtotal + fee + topping);
  const total = Math.max(0, subtotal + fee + topping - discount);
  return { subtotal, fee, topping, discount, total };
}
