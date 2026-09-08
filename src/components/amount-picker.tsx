"use client";

import { useState } from "react";
import { formatVnd } from "@/lib/format";

/**
 * Generic preset-chip amount picker — quick chips for `presets` plus a
 * "Khác" chip that reveals a free-entry input for anything else. Backs both
 * `<FeePicker>` ("Phí vận chuyển") and `<ToppingPicker>` ("Topping"), which
 * differ only in label and preset amounts.
 */
export function AmountPicker({
  label,
  presets,
  value,
  onChange,
}: {
  label: string;
  presets: number[];
  value: string;
  onChange: (v: string) => void;
}) {
  const numValue = Number(value) || 0;
  // Only read at mount — once the user starts interacting, `customOpen` is
  // driven by their clicks, not by re-deriving it from `value` each render
  // (which would fight typing in the custom input). `numValue > 0` also
  // covers a preset list that includes 0 itself (e.g. ToppingPicker's "0Đ"):
  // an unset/blank field (numValue === 0) should never auto-open custom
  // mode, regardless of whether 0 happens to be a preset.
  const [customOpen, setCustomOpen] = useState(() => numValue > 0 && !presets.includes(numValue));

  return (
    <div className="flex flex-col gap-2">
      <span className="text-[13px] text-muted">{label}</span>
      <div className="flex flex-wrap gap-2">
        {presets.map((preset) => (
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
              its 100px VNĐ/% toggle, so every row's right-aligned controls
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
