"use client";

import type { DiscountType } from "@/lib/pricing";

/**
 * Shared "Giảm giá" row for checkout and order-edit — label, amount input,
 * and the VNĐ/% toggle all on one row (not the toggle on its own row below)
 * so the whole control reads as compact as the rest of the payment-detail
 * fields.
 */
export function DiscountPicker({
  value,
  onChange,
  type,
  onTypeChange,
}: {
  value: string;
  onChange: (v: string) => void;
  type: DiscountType;
  onTypeChange: (t: DiscountType) => void;
}) {
  return (
    <div className="flex items-center gap-2">
      <span className="flex-none text-[13px] text-muted">Giảm giá</span>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        inputMode="numeric"
        placeholder="0"
        className="w-[80px] flex-none rounded-[10px] border border-line px-2 py-2 text-right text-base font-bold text-ink"
      />
      <div className="flex flex-1 gap-1 rounded-[10px] bg-page p-0.5">
        <button
          type="button"
          onClick={() => onTypeChange("vnd")}
          className={`flex-1 rounded-lg py-1 text-[10px] font-bold ${
            type === "vnd" ? "bg-primary text-white" : "text-muted"
          }`}
        >
          VNĐ
        </button>
        <button
          type="button"
          onClick={() => onTypeChange("pct")}
          className={`flex-1 rounded-lg py-1 text-[10px] font-bold ${
            type === "pct" ? "bg-primary text-white" : "text-muted"
          }`}
        >
          %
        </button>
      </div>
    </div>
  );
}
