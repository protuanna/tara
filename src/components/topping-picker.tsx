"use client";

import { AmountPicker } from "@/components/amount-picker";

const TOPPING_PRESETS = [0, 10000];

/**
 * "Topping" preset picker for checkout and order-edit — same shape as
 * `<FeePicker>` (a flat surcharge added on top of subtotal, see
 * `calcTotals()`), writing into the order's `topping_fee` column.
 */
export function ToppingPicker({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return <AmountPicker label="Topping" presets={TOPPING_PRESETS} value={value} onChange={onChange} />;
}
