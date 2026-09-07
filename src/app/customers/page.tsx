"use client";

import { useState } from "react";
import { useApiGet, apiMutate } from "@/lib/use-api";
import { formatVnd } from "@/lib/format";
import { Sheet } from "@/components/sheet";
import { Skeleton } from "@/components/skeleton";
import type { CustomerDTO } from "@/lib/services/customersService";

export default function CustomersPage() {
  const { data: customers, refetch } = useApiGet<CustomerDTO[]>("/api/customers");

  // Gate on `!customers` alone — refetch() (after add/collect-debt) flips
  // `loading` back to true while the old list is still valid; swapping back
  // to the skeleton would unmount <CustomersScreen> and close its open sheet.
  if (!customers) return <CustomersSkeleton />;

  return <CustomersScreen customers={customers} onChanged={refetch} />;
}

function CustomersScreen({
  customers,
  onChanged,
}: {
  customers: CustomerDTO[];
  onChanged: () => void;
}) {
  const [addOpen, setAddOpen] = useState(false);
  const [newName, setNewName] = useState("");
  const [newPhone, setNewPhone] = useState("");
  const [saving, setSaving] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);

  const [selected, setSelected] = useState<CustomerDTO | null>(null);
  const [collecting, setCollecting] = useState(false);

  async function handleAdd() {
    setAddError(null);
    setSaving(true);
    const result = await apiMutate("/api/customers", "POST", {
      name: newName,
      phone: newPhone || null,
    });
    setSaving(false);
    if ("error" in result) {
      setAddError(result.error);
      return;
    }
    setNewName("");
    setNewPhone("");
    setAddOpen(false);
    onChanged();
  }

  async function handleCollect() {
    if (!selected) return;
    setCollecting(true);
    await apiMutate(`/api/customers/${selected.id}/collect-debt`, "POST");
    setCollecting(false);
    setSelected(null);
    onChanged();
  }

  return (
    <div className="flex flex-col gap-3 px-4 py-3.5">
      <button
        onClick={() => {
          setAddError(null);
          setNewName("");
          setNewPhone("");
          setAddOpen(true);
        }}
        className="rounded-xl bg-primary py-3.5 text-[13px] font-bold text-white"
      >
        + Thêm khách hàng
      </button>

      <div className="flex flex-col overflow-hidden rounded-2xl border border-line bg-white">
        {customers.length === 0 && (
          <div className="p-8 text-center text-sm text-muted">Chưa có khách hàng nào.</div>
        )}
        {customers.map((c) => (
          <button
            key={c.id}
            onClick={() => setSelected(c)}
            className="flex items-center gap-3 border-b border-primary-tint p-3.5 text-left last:border-b-0"
          >
            <span className="flex size-10 flex-none items-center justify-center rounded-full bg-primary-tint text-[15px] font-extrabold text-primary-dark">
              {c.name.trim()[0]}
            </span>
            <span className="flex min-w-0 flex-1 flex-col gap-0.5">
              <span className="text-[13.5px] font-bold">{c.name}</span>
              <span className="text-[11.5px] text-muted">
                {c.phone || "Chưa có SĐT"} · {c.orderCount} đơn · {formatVnd(c.totalSpent)}
              </span>
            </span>
            {c.debt > 0 && (
              <span className="flex-none whitespace-nowrap rounded-full bg-[#FFF2E2] px-2.5 py-1 text-[11px] font-bold text-processing">
                Nợ {formatVnd(c.debt)}
              </span>
            )}
          </button>
        ))}
      </div>

      <Sheet open={addOpen} onClose={() => setAddOpen(false)}>
        <div className="text-[15px] font-bold">Thêm khách hàng</div>
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-semibold text-muted">Tên khách</label>
          <input
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="VD: Chị Lan"
            className="rounded-[10px] border border-line px-3 py-3 text-base"
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-semibold text-muted">Số điện thoại</label>
          <input
            value={newPhone}
            onChange={(e) => setNewPhone(e.target.value)}
            inputMode="tel"
            placeholder="VD: 090 123 4567"
            className="rounded-[10px] border border-line px-3 py-3 text-base"
          />
        </div>
        {addError && <p className="text-xs font-semibold text-unpaid">{addError}</p>}
        <button
          onClick={handleAdd}
          disabled={saving || !newName.trim()}
          className="rounded-xl bg-primary py-3.5 text-sm font-bold text-white disabled:opacity-60"
        >
          {saving ? "Đang lưu..." : "Lưu khách hàng"}
        </button>
      </Sheet>

      <Sheet open={selected !== null} onClose={() => setSelected(null)}>
        {selected && (
          <>
            <div className="flex items-center gap-3">
              <span className="flex size-11 flex-none items-center justify-center rounded-full bg-primary-tint text-base font-extrabold text-primary-dark">
                {selected.name.trim()[0]}
              </span>
              <div className="flex flex-col gap-0.5">
                <div className="text-[15px] font-bold">{selected.name}</div>
                <div className="text-xs text-muted">{selected.phone || "Chưa có SĐT"}</div>
              </div>
            </div>

            <div className="flex justify-between rounded-2xl border border-line p-3.5 text-[13px]">
              <span className="text-muted">Đã mua</span>
              <span className="font-bold">
                {selected.orderCount} đơn · {formatVnd(selected.totalSpent)}
              </span>
            </div>

            {selected.debt > 0 && (
              <>
                <div className="flex items-center justify-between rounded-2xl bg-[#FBEAEA] p-3.5">
                  <span className="text-[13px] text-[#8A2E2E]">Còn nợ</span>
                  <span className="text-lg font-extrabold text-unpaid">
                    {formatVnd(selected.debt)}
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
          </>
        )}
      </Sheet>
    </div>
  );
}

function CustomersSkeleton() {
  return (
    <div className="flex flex-col gap-3 px-4 py-3.5">
      <Skeleton className="h-[54px] rounded-xl" />
      <div className="flex flex-col gap-2 overflow-hidden rounded-2xl border border-line bg-white p-3">
        {Array.from({ length: 5 }, (_, i) => (
          <Skeleton key={i} className="h-[58px] rounded-xl" />
        ))}
      </div>
    </div>
  );
}
