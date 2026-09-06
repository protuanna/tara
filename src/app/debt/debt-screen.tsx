"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { formatVnd } from "@/lib/format";
import { Sheet } from "@/components/sheet";
import { collectDebt } from "./actions";

type Debtor = {
  customer_id: string | null;
  name: string | null;
  phone: string | null;
  debt: number | null;
};

export function DebtScreen({ debtors }: { debtors: Debtor[] }) {
  const router = useRouter();
  const [selected, setSelected] = useState<Debtor | null>(null);
  const [collecting, setCollecting] = useState(false);

  const totalDebt = debtors.reduce((sum, d) => sum + (d.debt ?? 0), 0);

  async function handleCollect() {
    if (!selected?.customer_id) return;
    setCollecting(true);
    await collectDebt(selected.customer_id);
    setCollecting(false);
    setSelected(null);
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-3 px-4 py-3.5">
      <div className="flex items-center justify-between rounded-2xl border border-line bg-white p-4">
        <div className="text-[13px] text-muted">Tổng phải thu</div>
        <div className="text-xl font-extrabold text-unpaid">{formatVnd(totalDebt)}</div>
      </div>

      <div className="flex flex-col gap-2">
        {debtors.length === 0 && (
          <div className="rounded-xl border border-line bg-white p-8 text-center text-sm text-muted">
            Không có khách nào đang nợ.
          </div>
        )}
        {debtors.map((d) => (
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
