"use client";

import { useState } from "react";
import { apiMutate } from "@/lib/use-api";
import { WALKIN_CUSTOMER_ID } from "@/lib/supabase/types";

export type PickerCustomer = { id: string; name: string; phone: string | null };

const WALKIN_CUSTOMER: PickerCustomer = { id: WALKIN_CUSTOMER_ID, name: "Khách lẻ", phone: null };

/**
 * Shared full-screen "chọn khách hàng" view for checkout and order-edit —
 * a search box over the already-loaded customer list (no extra API call,
 * the list is small enough to filter client-side) plus an
 * "+ Thêm khách mới" toggle that reveals the add-customer mini-form only
 * when tapped, instead of always showing it above the list. Always
 * prepends the walk-in "Khách lẻ" row itself, since `customers` here comes
 * from `/api/customers` — the same endpoint the `/customers` screen uses,
 * which deliberately excludes the walk-in row from its real-customer list
 * (see `customersService.list()`) — without this, there'd be no way to
 * switch *back* to "Khách lẻ" after picking someone else. Renders as a
 * `position: fixed` full-viewport overlay (same page, no route change)
 * rather than a bottom sheet — but capped to the app's own
 * `max-w-[480px]` mobile-width column (like the root shell in layout.tsx),
 * not a bare `inset-0` box, or it'd stretch edge-to-edge on anything wider
 * than a phone instead of matching the rest of the design. This component
 * instance stays mounted by its parent the whole time (only its `open`
 * prop toggles), so neither this screen's own search/add-form state nor
 * the caller's in-progress cart/edit draft is ever lost by opening/closing
 * it.
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

  if (!open) return null;

  const allCustomers = customers.some((c) => c.id === WALKIN_CUSTOMER_ID)
    ? customers
    : [WALKIN_CUSTOMER, ...customers];

  const query = search.trim().toLowerCase();
  const filtered = query
    ? allCustomers.filter(
        (c) => c.name.toLowerCase().includes(query) || (c.phone ?? "").includes(query),
      )
    : allCustomers;

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
    <div className="fixed inset-0 z-30 flex justify-center bg-page">
      <div className="flex h-dvh w-full max-w-[480px] flex-col bg-surface">
        <div className="flex flex-none items-center gap-2.5 border-b border-line bg-white px-4 py-3">
          <button
            onClick={handleClose}
            aria-label="Quay lại"
            className="flex size-[34px] flex-none items-center justify-center rounded-[11px] border border-line bg-white text-lg font-extrabold leading-none text-primary-dark"
          >
            ‹
          </button>
          <div className="text-base font-extrabold">Chọn khách hàng</div>
        </div>

        <div className="flex flex-1 flex-col gap-3 overflow-y-auto px-4 py-3.5">
          <div className="flex gap-2">
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Tìm theo tên hoặc SĐT..."
              className="min-w-0 flex-1 rounded-[10px] border border-line bg-white px-3 py-3 text-base"
            />
            <button
              type="button"
              onClick={() => setAddingOpen((v) => !v)}
              className={`flex-none whitespace-nowrap rounded-[10px] border px-3 py-2 text-xs font-bold ${
                addingOpen
                  ? "border-primary bg-primary text-white"
                  : "border-line bg-white text-primary-dark"
              }`}
            >
              + Thêm khách mới
            </button>
          </div>

          {addingOpen && (
            <div className="flex flex-col gap-2 rounded-[14px] border border-dashed border-primary-light bg-white p-3">
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
              {addCustomerError && (
                <p className="text-xs font-semibold text-unpaid">{addCustomerError}</p>
              )}
              <button
                onClick={handleAddCustomer}
                disabled={addingCustomer || !newName.trim()}
                className="rounded-lg bg-primary py-2 text-xs font-bold text-white disabled:opacity-60"
              >
                {addingCustomer ? "Đang thêm..." : "Thêm khách hàng"}
              </button>
            </div>
          )}

          <div className="flex flex-col gap-2">
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
        </div>
      </div>
    </div>
  );
}
