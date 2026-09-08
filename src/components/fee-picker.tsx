"use client";

import { useState } from "react";
import { formatVnd } from "@/lib/format";

const FEE_PRESETS = [5000, 10000, 20000];

/**
 * Shared "Phí vận chuyển" picker for checkout and order-edit — quick preset
 * chips (5.000Đ / 10.000Đ / 20.000Đ) plus a "Khác" chip that reveals a
 * free-entry input for anything else. Writes into the same `fee` field the
 * rest of the pricing pipeline already uses (`calcTotals()`'s surcharge),
 * so no schema or service change is needed, only this input's presentation.
 */
export function FeePicker({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const numValue = Number(value) || 0;
  // Only read at mount — once the user starts interacting, `customOpen` is
  // driven by their clicks, not by re-deriving it from `value` each render
  // (which would fight typing in the custom input).
  const [customOpen, setCustomOpen] = useState(() => numValue > 0 && !FEE_PRESETS.includes(numValue));

  return (
    <div className="flex flex-col gap-2">
      <span className="text-[13px] text-muted">Phí vận chuyển</span>
      <div className="flex flex-wrap gap-2">
        {FEE_PRESETS.map((preset) => (
          <button
            key={preset}
            type="button"
            onClick={() => {
              setCustomOpen(false);
              onChange(String(preset));
            }}
            className={`rounded-full border px-3 py-1.5 text-xs font-semibold ${
              !customOpen && numValue === preset
                ? "border-primary bg-primary text-white"
                : "border-line bg-white text-ink"
            }`}
          >
            {formatVnd(preset)}
          </button>
        ))}
        <button
          type="button"
          onClick={() => setCustomOpen(true)}
          className={`rounded-full border px-3 py-1.5 text-xs font-semibold ${
            customOpen ? "border-primary bg-primary text-white" : "border-line bg-white text-ink"
          }`}
        >
          Khác
        </button>
      </div>
      {customOpen && (
        <div className="flex justify-end">
          {/* 238px = DiscountPicker's 130px amount input + gap-2 (8px) +
              its 100px VNĐ/% toggle, so both rows' right-aligned controls
              line up as one visual block. */}
          <input
            value={value}
            onChange={(e) => onChange(e.target.value)}
            inputMode="numeric"
            placeholder="Nhập số tiền"
            autoFocus
            className="w-[238px] rounded-[10px] border border-line px-2.5 py-2 text-right text-base font-bold text-ink"
          />
        </div>
      )}
    </div>
  );
}
