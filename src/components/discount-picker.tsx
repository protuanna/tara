"use client";

import type { DiscountType } from "@/lib/pricing";

/**
 * Shared "Giảm giá" row for checkout and order-edit — amount input plus a
 * compact VNĐ/% toggle inline beside it (rather than its own full-width row
 * below), matching the input's own height (`py-2`) so they sit level in the
 * flex row.
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
    <div className="flex flex-col gap-2">
      <span className="text-[13px] text-muted">Giảm giá</span>
      <div className="flex items-center gap-2">
        <input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          inputMode="numeric"
          placeholder="0"
          className="w-[110px] rounded-[10px] border border-line px-2.5 py-2 text-right text-base font-bold text-ink"
        />
        <div className="flex flex-1 gap-1 rounded-[10px] bg-page p-1">
          <button
            type="button"
            onClick={() => onTypeChange("vnd")}
            className={`flex-1 rounded-lg py-1.5 text-[11px] font-bold ${
              type === "vnd" ? "bg-primary text-white" : "text-muted"
            }`}
          >
            VNĐ
          </button>
          <button
            type="button"
            onClick={() => onTypeChange("pct")}
            className={`flex-1 rounded-lg py-1.5 text-[11px] font-bold ${
              type === "pct" ? "bg-primary text-white" : "text-muted"
            }`}
          >
            %
          </button>
        </div>
      </div>
    </div>
  );
}
