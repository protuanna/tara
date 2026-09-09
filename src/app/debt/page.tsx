"use client";

import { useMemo } from "react";
import Link from "next/link";
import { useApiGet } from "@/lib/use-api";
import { formatVnd } from "@/lib/format";
import { Skeleton } from "@/components/skeleton";
import { useHeaderSearch } from "@/lib/header-search-context";
import { normalizeSearchText } from "@/lib/search";
import type { DebtorDTO } from "@/lib/services/debtService";

export default function DebtPage() {
  const { data } = useApiGet<{ debtors: DebtorDTO[]; totalDebt: number }>("/api/debt");

  const { query } = useHeaderSearch();
  const filteredDebtors = useMemo(() => {
    const q = normalizeSearchText(query.trim());
    if (!data) return [];
    if (!q) return data.debtors;
    return data.debtors.filter(
      (d) => normalizeSearchText(d.name ?? "").includes(q) || (d.phone ?? "").includes(q),
    );
  }, [data, query]);

  if (!data) return <DebtSkeleton />;

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
        {data.debtors.length > 0 && filteredDebtors.length === 0 && (
          <div className="rounded-xl border border-line bg-white p-8 text-center text-sm text-muted">
            Không tìm thấy khách khớp &quot;{query}&quot;.
          </div>
        )}
        {filteredDebtors.map((d) => (
          <Link
            key={d.customer_id}
            href={`/debt/${d.customer_id}`}
            className="flex items-center justify-between rounded-2xl border border-line bg-white px-3.5 py-3 text-left"
          >
            <div className="flex flex-col gap-0.5">
              <div className="text-[13px] font-semibold">{d.name ?? "Khách hàng"}</div>
              <div className="text-[11px] text-muted">{d.phone || "Chưa có SĐT"}</div>
            </div>
            <div className="text-sm font-bold text-unpaid">{formatVnd(d.debt ?? 0)}</div>
          </Link>
        ))}
      </div>
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
