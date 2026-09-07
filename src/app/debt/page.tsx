"use client";

import { useState } from "react";
import { useApiGet, apiMutate } from "@/lib/use-api";
import { formatVnd } from "@/lib/format";
import { Sheet } from "@/components/sheet";
import { Skeleton } from "@/components/skeleton";
import type { DebtorDTO } from "@/lib/services/debtService";

export default function DebtPage() {
  const { data, refetch } = useApiGet<{ debtors: DebtorDTO[]; totalDebt: number }>("/api/debt");

  const [selected, setSelected] = useState<DebtorDTO | null>(null);
  const [collecting, setCollecting] = useState(false);

  // Gate on `!data` alone — refetch() (after collectDebt) flips `loading`
  // back to true while the old list is still valid; showing the skeleton
  // again would close the open detail sheet mid-interaction.
  if (!data) return <DebtSkeleton />;

  async function handleCollect() {
    if (!selected?.customer_id) return;
    setCollecting(true);
    await apiMutate(`/api/customers/${selected.customer_id}/collect-debt`, "POST");
    setCollecting(false);
    setSelected(null);
    refetch();
  }

  return (
    <div className="flex flex-col gap-3 px-4 py-3.5">
      <div className="flex items-center justify-between rounded-2xl border border-line bg-white p-4">
        <div className="text-[13px] text-muted">Tổng phải thu</div>
        <div className="text-xl font-extrabold text-unpaid">{formatVnd(data.totalDebt)}</div>
      </div>

      <div className="flex flex-col gap-2">
        {data.debtors.length === 0 && (
          <div className="rounded-xl border border-line bg-white p-8 text-center text-sm text-muted">
            Không có khách nào đang nợ.
          </div>
        )}
        {data.debtors.map((d) => (
          <button
            key={d.customer_id}
            onClick={() => setSelected(d)}
            className="flex items-center justify-between rounded-2xl border border-line bg-white px-3.5 py-3 text-left"
          >
            <div className="flex flex-col gap-0.5">
              <div className="text-[13px] font-semibold">{d.name ?? "Khách hàng"}</div>
              <div className="text-[11px] text-muted">{d.phone || "Chưa có SĐT"}</div>
            </div>
            <div className="text-sm font-bold text-unpaid">{formatVnd(d.debt ?? 0)}</div>
          </button>
        ))}
      </div>

      <Sheet open={selected !== null} onClose={() => setSelected(null)}>
        {selected && (
          <>
            <div className="text-[15px] font-bold">{selected.name ?? "Khách hàng"}</div>
            <div className="text-xs text-muted">{selected.phone || "Chưa có SĐT"}</div>
            <div className="flex items-center justify-between rounded-2xl bg-[#FBEAEA] p-3.5">
              <span className="text-[13px] text-[#8A2E2E]">Còn nợ</span>
              <span className="text-lg font-extrabold text-unpaid">
                {formatVnd(selected.debt ?? 0)}
              </span>
            </div>
            <button
              onClick={handleCollect}
              disabled={collecting}
              className="rounded-xl bg-primary py-3.5 text-sm font-bold text-white disabled:opacity-60"
            >
              {collecting ? "Đang cập nhật..." : "Đã thu đủ nợ"}
            </button>
          </>
        )}
      </Sheet>
    </div>
  );
}

function DebtSkeleton() {
  return (
    <div className="flex flex-col gap-3 px-4 py-3.5">
      <Skeleton className="h-[64px] rounded-2xl" />
      <div className="flex flex-col gap-2">
        {Array.from({ length: 4 }, (_, i) => (
          <Skeleton key={i} className="h-[58px] rounded-2xl" />
        ))}
      </div>
    </div>
  );
}
