"use client";

import { useState } from "react";
import { Sheet } from "@/components/sheet";
import { apiMutate } from "@/lib/use-api";
import { WALKIN_CUSTOMER_ID } from "@/lib/supabase/types";

export type PickerCustomer = { id: string; name: string; phone: string | null };

/**
 * Shared "chọn khách hàng" sheet for checkout and order-edit — a search box
 * over the already-loaded customer list (no extra API call, the list is
 * small enough to filter client-side) plus an "+ Thêm khách mới" toggle
 * that reveals the add-customer mini-form only when tapped, instead of
 * always showing it above the list.
 */
export function CustomerPicker({
  open,
  onClose,
  customers,
  selectedId,
  onSelect,
  onCustomerAdded,
}: {
  open: boolean;
  onClose: () => void;
  customers: PickerCustomer[];
  selectedId: string;
  onSelect: (id: string) => void;
  onCustomerAdded: (customer: PickerCustomer) => void;
}) {
  const [search, setSearch] = useState("");
  const [addingOpen, setAddingOpen] = useState(false);
  const [addingCustomer, setAddingCustomer] = useState(false);
  const [newName, setNewName] = useState("");
  const [newPhone, setNewPhone] = useState("");
  const [addCustomerError, setAddCustomerError] = useState<string | null>(null);

  const query = search.trim().toLowerCase();
  const filtered = query
    ? customers.filter(
        (c) => c.name.toLowerCase().includes(query) || (c.phone ?? "").includes(query),
      )
    : customers;

  function handleClose() {
    onClose();
    setSearch("");
    setAddingOpen(false);
    setAddCustomerError(null);
  }

  async function handleAddCustomer() {
    setAddCustomerError(null);
    setAddingCustomer(true);
    const result = await apiMutate<PickerCustomer>("/api/customers", "POST", {
      name: newName,
      phone: newPhone || null,
    });
    setAddingCustomer(false);
    if ("error" in result) {
      setAddCustomerError(result.error);
      return;
    }
    onCustomerAdded(result.data);
    onSelect(result.data.id);
    setNewName("");
    setNewPhone("");
    handleClose();
  }

  return (
    <Sheet open={open} onClose={handleClose}>
      <div className="text-[15px] font-bold">Chọn khách hàng</div>

      <div className="flex gap-2">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Tìm theo tên hoặc SĐT..."
          className="min-w-0 flex-1 rounded-[10px] border border-line px-3 py-2 text-base"
        />
        <button
          type="button"
          onClick={() => setAddingOpen((v) => !v)}
          className={`flex-none whitespace-nowrap rounded-[10px] border px-3 py-2 text-xs font-bold ${
            addingOpen ? "border-primary bg-primary text-white" : "border-line bg-white text-primary-dark"
          }`}
        >
          + Thêm khách mới
        </button>
      </div>

      {addingOpen && (
        <div className="flex flex-col gap-2 rounded-[14px] border border-dashed border-primary-light p-3">
          <div className="text-xs font-bold text-primary-dark">Thêm khách hàng mới</div>
          <input
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="Tên khách"
            className="rounded-[10px] border border-line px-3 py-2 text-base"
          />
          <input
            value={newPhone}
            onChange={(e) => setNewPhone(e.target.value)}
            inputMode="tel"
            placeholder="Số điện thoại (không bắt buộc)"
            className="rounded-[10px] border border-line px-3 py-2 text-base"
          />
          {addCustomerError && <p className="text-xs font-semibold text-unpaid">{addCustomerError}</p>}
          <button
            onClick={handleAddCustomer}
            disabled={addingCustomer || !newName.trim()}
            className="rounded-lg bg-primary py-2 text-xs font-bold text-white disabled:opacity-60"
          >
            {addingCustomer ? "Đang thêm..." : "Thêm khách hàng"}
          </button>
        </div>
      )}

      <div className="flex flex-col gap-2 overflow-y-auto">
        {filtered.map((c) => (
          <button
            key={c.id}
            onClick={() => {
              onSelect(c.id);
              handleClose();
            }}
            className={`flex items-center gap-3 rounded-[14px] border p-3 text-left ${
              c.id === selectedId ? "border-primary bg-primary-tint" : "border-line bg-white"
            }`}
          >
            <span className="flex size-[38px] flex-none items-center justify-center rounded-full bg-primary-tint text-[15px] font-extrabold text-primary-dark">
              {c.name.trim()[0]}
            </span>
            <span className="flex min-w-0 flex-1 flex-col gap-0.5">
              <span className="text-[13.5px] font-bold">{c.name}</span>
              <span className="text-[11.5px] text-muted">
                {c.id === WALKIN_CUSTOMER_ID ? "Không ghi sổ khách" : c.phone || "Chưa có SĐT"}
              </span>
            </span>
            {c.id === selectedId && (
              <span className="flex-none text-[15px] font-extrabold text-primary-dark">✓</span>
            )}
          </button>
        ))}
        {filtered.length === 0 && (
          <p className="py-6 text-center text-sm text-muted">Không tìm thấy khách hàng.</p>
        )}
      </div>
    </Sheet>
  );
}
