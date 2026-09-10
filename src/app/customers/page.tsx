"use client";

import { useMemo, useState } from "react";
import { useApiGet, apiMutate } from "@/lib/use-api";
import { formatVnd } from "@/lib/format";
import { Sheet } from "@/components/sheet";
import { Skeleton } from "@/components/skeleton";
import { useHeaderSearch } from "@/lib/header-search-context";
import { normalizeSearchText } from "@/lib/search";
import { PencilIcon, PhoneIcon } from "@/components/icons";
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

  const [editingCustomer, setEditingCustomer] = useState(false);
  const [editName, setEditName] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [editAddress, setEditAddress] = useState("");
  const [editSaving, setEditSaving] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  const { query } = useHeaderSearch();
  const filteredCustomers = useMemo(() => {
    const q = normalizeSearchText(query.trim());
    if (!q) return customers;
    return customers.filter(
      (c) => normalizeSearchText(c.name).includes(q) || (c.phone ?? "").includes(q),
    );
  }, [customers, query]);

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

  function openEdit() {
    if (!selected) return;
    setEditName(selected.name);
    setEditPhone(selected.phone ?? "");
    setEditAddress(selected.address ?? "");
    setEditError(null);
    setEditingCustomer(true);
  }

  async function handleSaveEdit() {
    if (!selected) return;
    setEditError(null);
    setEditSaving(true);
    const result = await apiMutate<{
      id: string;
      name: string;
      phone: string | null;
      address: string | null;
    }>(`/api/customers/${selected.id}`, "PATCH", {
      name: editName,
      phone: editPhone || null,
      address: editAddress || null,
    });
    setEditSaving(false);
    if ("error" in result) {
      setEditError(result.error);
      return;
    }
    setSelected({ ...selected, ...result.data });
    setEditingCustomer(false);
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
        {customers.length > 0 && filteredCustomers.length === 0 && (
          <div className="p-8 text-center text-sm text-muted">
            Không tìm thấy khách hàng khớp &quot;{query}&quot;.
          </div>
        )}
        {filteredCustomers.map((c) => (
          // A <button> can't validly nest another <button> (the call
          // button below), so this row is a div with a button role instead
          // of a real <button> — same click-to-open-sheet behavior, keyboard
          // accessible via tabIndex + Enter/Space.
          <div
            key={c.id}
            role="button"
            tabIndex={0}
            onClick={() => {
              setEditingCustomer(false);
              setSelected(c);
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                setEditingCustomer(false);
                setSelected(c);
              }
            }}
            className="flex items-center gap-3 border-b border-primary-tint p-3.5 text-left last:border-b-0"
          >
            {c.avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={c.avatarUrl}
                alt={c.name}
                className="size-10 flex-none rounded-full object-cover"
              />
            ) : (
              <span className="flex size-10 flex-none items-center justify-center rounded-full bg-primary-tint text-[15px] font-extrabold text-primary-dark">
                {c.name.trim()[0]}
              </span>
            )}
            <span className="flex min-w-0 flex-1 flex-col gap-0.5">
              <span className="text-[13.5px] font-bold">{c.name}</span>
              <span className="text-[11.5px] text-muted">
                {c.phone || "Chưa có SĐT"} · {c.orderCount} đơn · {formatVnd(c.totalSpent)}
              </span>
            </span>
            {c.phone && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  window.location.href = `tel:${c.phone}`;
                }}
                aria-label={`Gọi ${c.phone}`}
                className="flex size-8 flex-none items-center justify-center rounded-full border border-line bg-white text-primary-dark"
              >
                <PhoneIcon className="size-[14px]" />
              </button>
            )}
            {c.debt > 0 && (
              <span className="flex-none whitespace-nowrap rounded-full bg-[#FFF2E2] px-2.5 py-1 text-[11px] font-bold text-processing">
                Nợ {formatVnd(c.debt)}
              </span>
            )}
          </div>
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

      <Sheet
        open={selected !== null}
        onClose={() => {
          setSelected(null);
          setEditingCustomer(false);
        }}
      >
        {selected && (
          <>
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-3">
                {selected.avatarUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={selected.avatarUrl}
                    alt={selected.name}
                    className="size-11 flex-none rounded-full object-cover"
                  />
                ) : (
                  <span className="flex size-11 flex-none items-center justify-center rounded-full bg-primary-tint text-base font-extrabold text-primary-dark">
                    {selected.name.trim()[0]}
                  </span>
                )}
                <div className="flex flex-col gap-0.5">
                  <div className="text-[15px] font-bold">{selected.name}</div>
                  {selected.phone ? (
                    <a
                      href={`tel:${selected.phone}`}
                      className="flex w-fit items-center gap-1 text-xs font-semibold text-primary-dark"
                    >
                      <PhoneIcon className="size-[12px]" />
                      {selected.phone}
                    </a>
                  ) : (
                    <div className="text-xs text-muted">Chưa có SĐT</div>
                  )}
                </div>
              </div>
              {!editingCustomer && (
                <button
                  type="button"
                  onClick={openEdit}
                  aria-label="Sửa thông tin khách hàng"
                  className="flex size-8 flex-none items-center justify-center rounded-full border border-line bg-white text-primary-dark"
                >
                  <PencilIcon className="size-[15px]" />
                </button>
              )}
            </div>

            {editingCustomer ? (
              <div className="flex flex-col gap-2.5 rounded-2xl border border-line p-3.5">
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-muted">Tên khách</label>
                  <input
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="rounded-[10px] border border-line px-3 py-3 text-base"
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-muted">Số điện thoại</label>
                  <input
                    value={editPhone}
                    onChange={(e) => setEditPhone(e.target.value)}
                    inputMode="tel"
                    className="rounded-[10px] border border-line px-3 py-3 text-base"
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-muted">Địa chỉ</label>
                  <input
                    value={editAddress}
                    onChange={(e) => setEditAddress(e.target.value)}
                    className="rounded-[10px] border border-line px-3 py-3 text-base"
                  />
                </div>
                {editError && <p className="text-xs font-semibold text-unpaid">{editError}</p>}
                <div className="flex gap-2.5">
                  <button
                    onClick={() => setEditingCustomer(false)}
                    className="flex-1 rounded-xl bg-[#F1F0F3] py-3.5 text-sm font-semibold text-ink"
                  >
                    Hủy
                  </button>
                  <button
                    onClick={handleSaveEdit}
                    disabled={editSaving || !editName.trim()}
                    className="flex-[1.4] rounded-xl bg-primary py-3.5 text-sm font-bold text-white disabled:opacity-60"
                  >
                    {editSaving ? "Đang lưu..." : "Lưu thay đổi"}
                  </button>
                </div>
              </div>
            ) : (
              (selected.email || selected.address) && (
                <div className="flex flex-col gap-1.5 rounded-2xl border border-line p-3.5 text-[13px]">
                  {selected.email && (
                    <div className="flex justify-between gap-2">
                      <span className="text-muted">Email</span>
                      <span className="font-semibold">{selected.email}</span>
                    </div>
                  )}
                  {selected.address && (
                    <div className="flex justify-between gap-2">
                      <span className="flex-none text-muted">Địa chỉ</span>
                      <span className="text-right font-semibold">{selected.address}</span>
                    </div>
                  )}
                </div>
              )
            )}

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
