"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { useApiGet } from "@/lib/use-api";
import { formatVnd } from "@/lib/format";
import { Skeleton } from "@/components/skeleton";
import type { ReportDTO, ReportPeriod } from "@/lib/services/reportService";

const PERIOD_TABS: { value: ReportPeriod; label: string }[] = [
  { value: "today", label: "Hôm nay" },
  { value: "7d", label: "7 ngày" },
  { value: "30d", label: "30 ngày" },
];

function periodUrl(p: ReportPeriod): string {
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
  const searchParams = useSearchParams();
  const period = (searchParams.get("period") as ReportPeriod) || "7d";

  const { data, loading } = useApiGet<ReportDTO>(`/api/report?period=${period}`);

  if (loading || !data) return <ReportSkeleton />;

  const maxQty = data.topProducts[0]?.qty ?? 1;
  const maxBar = Math.max(...data.bars.map((b) => b.value), 1);
  const CIRC = 2 * Math.PI * 36;
  let acc = 0;
  const donutSegments = data.donut.map((d) => {
    const frac = d.pct / 100;
    const seg = {
      ...d,
      dash: `${(frac * CIRC).toFixed(1)} ${CIRC.toFixed(1)}`,
      offset: (-acc * CIRC).toFixed(1),
    };
    acc += frac;
    return seg;
  });

  return (
    <div className="flex flex-col gap-3.5 px-4 pb-6 pt-3">
      <div className="flex gap-1 rounded-[22px] bg-page p-1">
        {PERIOD_TABS.map((tab) => (
          <Link
            key={tab.value}
            href={periodUrl(tab.value)}
            className={`flex-1 rounded-[18px] py-2 text-center text-[12.5px] font-semibold ${
              tab.value === period ? "bg-white text-primary-dark shadow" : "text-muted"
            }`}
          >
            {tab.label}
          </Link>
        ))}
      </div>

      <div className="flex flex-col gap-4 rounded-[20px] bg-gradient-to-br from-primary to-primary-dark p-4 text-white">
        <div className="flex flex-col gap-0.5">
          <div className="text-[12.5px] opacity-85">Doanh thu kỳ này</div>
          <div className="text-[29px] font-extrabold tracking-tight">{formatVnd(data.revenue)}</div>
        </div>
        <div className="flex h-[112px] items-end gap-1.5">
          {data.bars.map((bar) => (
            <div key={bar.key} className="flex flex-1 flex-col items-center gap-1.5">
              <div className="h-[13px] text-[10.5px] font-semibold opacity-95">
                {bar.value > 0 ? `${Math.round(bar.value / 1000)}k` : ""}
              </div>
              <div
                className={`w-full rounded-t-lg rounded-b-[3px] ${
                  bar.label === "Nay" ? "bg-white" : "bg-white/55"
                }`}
                style={{ height: `${Math.max(6, Math.round((bar.value / maxBar) * 96))}px` }}
              />
              <div className="text-[10.5px] opacity-90">{bar.label}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2">
        <div className="flex flex-col gap-0.5 rounded-2xl border border-line bg-white p-3">
          <div className="text-[11px] text-muted">Số đơn</div>
          <div className="text-base font-extrabold">{data.orderCount}</div>
        </div>
        <div className="flex flex-col gap-0.5 rounded-2xl border border-line bg-white p-3">
          <div className="text-[11px] text-muted">TB/đơn</div>
          <div className="text-sm font-extrabold">{formatVnd(data.avgOrder)}</div>
        </div>
        <div className="flex flex-col gap-0.5 rounded-2xl border border-line bg-white p-3">
          <div className="text-[11px] text-muted">Món đã bán</div>
          <div className="text-base font-extrabold">{data.itemsSold}</div>
        </div>
      </div>

      <div className="flex flex-col gap-3 rounded-[18px] border border-line bg-white p-4">
        <div className="text-sm font-bold">Bán chạy nhất</div>
        {data.topProducts.length === 0 && (
          <p className="text-xs text-muted">Chưa có dữ liệu bán hàng trong kỳ này.</p>
        )}
        {data.topProducts.map((p, i) => (
          <div key={p.name} className="flex items-center gap-3">
            <div className="flex size-[34px] flex-none items-center justify-center rounded-xl bg-primary-tint text-[13px] font-extrabold text-primary-dark">
              {i + 1}
            </div>
            <div className="flex min-w-0 flex-1 flex-col gap-1">
              <div className="flex justify-between gap-2">
                <span className="truncate text-[13px] font-semibold">{p.name}</span>
                <span className="flex-none text-xs text-muted">{p.qty} phần</span>
              </div>
              <div className="h-1.5 overflow-hidden rounded-full bg-page">
                <div
                  className="h-full rounded-full bg-primary"
                  style={{ width: `${Math.round((p.qty / maxQty) * 100)}%` }}
                />
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="flex flex-col gap-3.5 rounded-[18px] border border-line bg-white p-4">
        <div className="text-sm font-bold">Cơ cấu thanh toán</div>
        {donutSegments.length === 0 ? (
          <p className="text-xs text-muted">Chưa có dữ liệu thanh toán trong kỳ này.</p>
        ) : (
          <div className="flex items-center gap-4">
            <svg width={96} height={96} viewBox="0 0 96 96" className="flex-none -rotate-90">
              <circle cx="48" cy="48" r="36" fill="none" stroke="#EDEDF2" strokeWidth="14" />
              {donutSegments.map((d) => (
                <circle
                  key={d.method}
                  cx="48"
                  cy="48"
                  r="36"
                  fill="none"
                  stroke={d.color}
                  strokeWidth="14"
                  strokeDasharray={d.dash}
                  strokeDashoffset={d.offset}
                />
              ))}
            </svg>
            <div className="flex min-w-0 flex-1 flex-col gap-2">
              {donutSegments.map((d) => (
                <div key={d.method} className="flex items-center gap-2">
                  <div className="size-2.5 flex-none rounded-sm" style={{ background: d.color }} />
                  <div className="flex-1 text-[12.5px] font-semibold">{d.label}</div>
                  <div className="flex-none text-xs text-muted">{d.pct}%</div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function ReportSkeleton() {
  return (
    <div className="flex flex-col gap-3.5 px-4 pb-6 pt-3">
      <Skeleton className="h-11 rounded-[22px]" />
      <Skeleton className="h-[220px] rounded-[20px]" />
      <div className="grid grid-cols-3 gap-2">
        {Array.from({ length: 3 }, (_, i) => (
          <Skeleton key={i} className="h-[60px] rounded-2xl" />
        ))}
      </div>
      <Skeleton className="h-[180px] rounded-[18px]" />
      <Skeleton className="h-[160px] rounded-[18px]" />
    </div>
  );
}
