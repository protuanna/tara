"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { formatVnd } from "@/lib/format";
import { Sheet } from "@/components/sheet";
import { createCustomer } from "@/app/checkout/actions";
import { collectDebt } from "@/app/debt/actions";

type CustomerItem = {
  id: string;
  name: string;
  phone: string | null;
  orderCount: number;
  totalSpent: number;
  debt: number;
};

export function CustomersScreen({ customers }: { customers: CustomerItem[] }) {
  const router = useRouter();

  const [addOpen, setAddOpen] = useState(false);
  const [newName, setNewName] = useState("");
  const [newPhone, setNewPhone] = useState("");
  const [saving, setSaving] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);

  const [selected, setSelected] = useState<CustomerItem | null>(null);
  const [collecting, setCollecting] = useState(false);

  async function handleAdd() {
    setAddError(null);
    setSaving(true);
    const result = await createCustomer({ name: newName, phone: newPhone || null });
    setSaving(false);
    if ("error" in result) {
      setAddError(result.error);
      return;
    }
    setNewName("");
    setNewPhone("");
    setAddOpen(false);
    router.refresh();
  }

  async function handleCollect() {
    if (!selected) return;
    setCollecting(true);
    await collectDebt(selected.id);
    setCollecting(false);
    setSelected(null);
    router.refresh();
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
            className="rounded-[10px] border border-line px-3 py-3 text-sm"
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-semibold text-muted">Số điện thoại</label>
          <input
            value={newPhone}
            onChange={(e) => setNewPhone(e.target.value)}
            inputMode="tel"
            placeholder="VD: 090 123 4567"
            className="rounded-[10px] border border-line px-3 py-3 text-sm"
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
