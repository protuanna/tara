"use client";

import { useState } from "react";
import { formatVnd } from "@/lib/format";

const FEE_PRESETS = [5000, 10000, 15000, 20000, 25000, 30000, 35000, 40000, 45000, 50000];

/**
 * Shared "Phí vận chuyển" picker for checkout and order-edit — quick preset
 * chips (5.000Đ .. 50.000Đ) plus a "Khác" chip that reveals a free-entry
 * input for anything else. Writes into the same `fee` field the rest of the
 * pricing pipeline already uses (`calcTotals()`'s surcharge), so no schema
 * or service change is needed, only this input's presentation.
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
          <input
            value={value}
            onChange={(e) => onChange(e.target.value)}
            inputMode="numeric"
            placeholder="Nhập số tiền"
            autoFocus
            className="w-[130px] rounded-[10px] border border-line px-2.5 py-2 text-right text-base font-bold text-ink"
          />
        </div>
      )}
    </div>
  );
}
