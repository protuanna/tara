"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { useApiGet } from "@/lib/use-api";
import { formatVnd } from "@/lib/format";
import { vnDateKey, formatDateRangeShort } from "@/lib/date";
import { Sheet } from "@/components/sheet";
import { Skeleton } from "@/components/skeleton";
import type { ReportDTO, ReportPeriod } from "@/lib/services/reportService";

const PERIOD_CHIPS: { value: ReportPeriod; label: string }[] = [
  { value: "today", label: "Hôm nay" },
  { value: "7d", label: "7 ngày" },
  { value: "30d", label: "30 ngày" },
  { value: "all", label: "Tất cả thời gian" },
];

function periodUrl(p: ReportPeriod, range?: { from: string; to: string }): string {
  if (p === "custom" && range) return `/report?period=custom&from=${range.from}&to=${range.to}`;
  return p === "7d" ? "/report" : `/report?period=${p}`;
}

// useSearchParams() opts the subtree into client-only rendering, which
// Next.js requires wrapping in Suspense so the rest of the route can still
// have a static shell.
export default function ReportPage() {
  return (
    <Suspense fallback={<ReportSkeleton />}>
      <ReportContent />
    </Suspense>
  );
}

function ReportContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const period = (searchParams.get("period") as ReportPeriod) || "7d";
  const activeFrom = searchParams.get("from") ?? "";
  const activeTo = searchParams.get("to") ?? "";

  const apiParams = new URLSearchParams({ period });
  if (period === "custom") {
    if (activeFrom) apiParams.set("from", activeFrom);
    if (activeTo) apiParams.set("to", activeTo);
  }
  const { data, loading } = useApiGet<ReportDTO>(`/api/report?${apiParams.toString()}`);

  const today = vnDateKey(new Date());
  const [rangeOpen, setRangeOpen] = useState(false);
  const [fromInput, setFromInput] = useState(activeFrom || today);
  const [toInput, setToInput] = useState(activeTo || today);

  if (loading || !data) return <ReportSkeleton />;

  function openRangePicker() {
    setFromInput(activeFrom || today);
    setToInput(activeTo || today);
    setRangeOpen(true);
  }

  function handleApplyRange() {
    setRangeOpen(false);
    router.push(periodUrl("custom", { from: fromInput, to: toInput }));
  }

  return (
    <div className="flex flex-col gap-3.5 px-4 pb-6 pt-3">
      <div className="no-scrollbar flex gap-2 overflow-x-auto">
        {PERIOD_CHIPS.map((chip) => (
          <Link
            key={chip.value}
            href={periodUrl(chip.value)}
            className={`flex-none whitespace-nowrap rounded-full px-3.5 py-2 text-xs font-semibold ${
              chip.value === period
                ? "bg-primary text-white shadow-md"
                : "bg-primary-tint text-primary-dark"
            }`}
          >
            {chip.label}
          </Link>
        ))}
        <button
          onClick={openRangePicker}
          className={`flex-none whitespace-nowrap rounded-full px-3.5 py-2 text-xs font-semibold ${
            period === "custom"
              ? "bg-primary text-white shadow-md"
              : "bg-primary-tint text-primary-dark"
          }`}
        >
          {period === "custom" && activeFrom && activeTo
            ? formatDateRangeShort(activeFrom, activeTo)
            : "Tùy chọn"}
        </button>
      </div>

      <div className="flex flex-col gap-3 rounded-[20px] bg-gradient-to-br from-primary to-primary-dark p-4 text-white">
        <div className="flex items-center justify-between">
          <div className="text-[12.5px] opacity-85">Tổng doanh thu kỳ này</div>
          <div className="text-[22px] font-extrabold tracking-tight">{formatVnd(data.revenue)}</div>
        </div>
        <div className="h-px bg-white/20" />
        <div className="flex items-center justify-between">
          <div className="flex flex-col gap-0.5">
            <div className="text-[12.5px] opacity-85">Doanh thu đã thu</div>
            <div className="text-[10.5px] opacity-65">Đơn đã thanh toán + thu − chi</div>
          </div>
          <div className="text-lg font-extrabold">{formatVnd(data.collectedRevenue)}</div>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2">
        <div className="flex flex-col gap-0.5 rounded-2xl border border-line bg-white p-3">
          <div className="text-[11px] text-muted">Tổng tiền hàng</div>
          <div className="text-sm font-extrabold">{formatVnd(data.orderRevenue)}</div>
        </div>
        <div className="flex flex-col gap-0.5 rounded-2xl border border-line bg-white p-3">
          <div className="text-[11px] text-muted">Tổng thu</div>
          <div className="text-sm font-extrabold text-paid">{formatVnd(data.totalIncome)}</div>
        </div>
        <div className="flex flex-col gap-0.5 rounded-2xl border border-line bg-white p-3">
          <div className="text-[11px] text-muted">Tổng chi</div>
          <div className="text-sm font-extrabold text-[#3B5BDB]">{formatVnd(data.totalExpenses)}</div>
        </div>
      </div>

      <div className="mt-1 flex flex-col gap-2">
        <div className="text-[13px] font-bold">Công nợ</div>
        <div className="grid grid-cols-2 gap-2">
          <div className="flex flex-col gap-0.5 rounded-2xl border border-line bg-white p-3">
            <div className="text-[11px] text-muted">Tổng số nợ</div>
            <div className="text-base font-extrabold text-unpaid">{formatVnd(data.totalDebt)}</div>
          </div>
          <div className="flex flex-col gap-0.5 rounded-2xl border border-line bg-white p-3">
            <div className="text-[11px] text-muted">Tiền hàng đã thanh toán</div>
            <div className="text-base font-extrabold text-paid">
              {formatVnd(data.totalPaidAmount)}
            </div>
          </div>
        </div>
      </div>

      <Sheet open={rangeOpen} onClose={() => setRangeOpen(false)}>
        <div className="text-[15px] font-bold">Chọn khoảng thời gian</div>
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-semibold text-muted">Từ ngày</label>
          <input
            type="date"
            value={fromInput}
            max={toInput}
            onChange={(e) => setFromInput(e.target.value)}
            className="rounded-[10px] border border-line px-3 py-3 text-base"
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-semibold text-muted">Đến ngày</label>
          <input
            type="date"
            value={toInput}
            min={fromInput}
            onChange={(e) => setToInput(e.target.value)}
            className="rounded-[10px] border border-line px-3 py-3 text-base"
          />
        </div>
        <button
          onClick={handleApplyRange}
          disabled={!fromInput || !toInput}
          className="rounded-xl bg-primary py-3.5 text-sm font-bold text-white disabled:opacity-60"
        >
          Áp dụng
        </button>
      </Sheet>
    </div>
  );
}

function ReportSkeleton() {
  return (
    <div className="flex flex-col gap-3.5 px-4 pb-6 pt-3">
      <div className="flex gap-2">
        {Array.from({ length: 4 }, (_, i) => (
          <Skeleton key={i} className="h-8 w-20 flex-none rounded-full" />
        ))}
      </div>
      <Skeleton className="h-[170px] rounded-[20px]" />
      <div className="grid grid-cols-3 gap-2">
        {Array.from({ length: 3 }, (_, i) => (
          <Skeleton key={i} className="h-[60px] rounded-2xl" />
        ))}
      </div>
      <div className="flex flex-col gap-2">
        <Skeleton className="h-4 w-20 rounded" />
        <div className="grid grid-cols-2 gap-2">
          {Array.from({ length: 2 }, (_, i) => (
            <Skeleton key={i} className="h-[58px] rounded-2xl" />
          ))}
        </div>
      </div>
    </div>
  );
}
