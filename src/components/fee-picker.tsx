"use client";

import { AmountPicker } from "@/components/amount-picker";

const FEE_PRESETS = [0, 5000, 10000, 20000];

/**
 * "Phí vận chuyển" preset picker for checkout and order-edit — writes into
 * the same `fee` field the pricing pipeline already uses (`calcTotals()`'s
 * surcharge), so no schema/service change is needed, only this input's
 * presentation. Includes a `0Đ` preset, same as `<ToppingPicker>` — an
 * unset/blank field lands on that chip by default instead of nothing being
 * highlighted.
 */
export function FeePicker({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return <AmountPicker label="Phí vận chuyển" presets={FEE_PRESETS} value={value} onChange={onChange} />;
}
