"use client";

import { Suspense, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useApiGet, apiMutate } from "@/lib/use-api";
import { formatVnd } from "@/lib/format";
import { formatOrderTime, vnDateKey, formatDateRangeShort } from "@/lib/date";
import { Sheet } from "@/components/sheet";
import { Skeleton } from "@/components/skeleton";
import type {
  CashEntryType,
  ExpenseDTO,
  ExpenseTimeFilter,
  ExpenseTypeFilter,
} from "@/lib/services/expensesService";

const TYPE_TABS: { value: ExpenseTypeFilter; label: string }[] = [
  { value: "all", label: "Tất cả" },
  { value: "thu", label: "Thu" },
  { value: "chi", label: "Chi" },
];

const TIME_CHIPS: { value: ExpenseTimeFilter; label: string }[] = [
  { value: "all", label: "Tất cả thời gian" },
  { value: "today", label: "Hôm nay" },
  { value: "7d", label: "7 ngày" },
  { value: "30d", label: "30 ngày" },
];

function expensesUrl(params: {
  time: ExpenseTimeFilter;
  type: ExpenseTypeFilter;
  from?: string;
  to?: string;
}): string {
  const sp = new URLSearchParams();
  if (params.type !== "all") sp.set("type", params.type);
  if (params.time !== "all") sp.set("time", params.time);
  if (params.time === "custom") {
    if (params.from) sp.set("from", params.from);
    if (params.to) sp.set("to", params.to);
  }
  const qs = sp.toString();
  return qs ? `/expenses?${qs}` : "/expenses";
}

// useSearchParams() opts the subtree into client-only rendering, which
// Next.js requires wrapping in Suspense so the rest of the route can still
// have a static shell.
export default function ExpensesPage() {
  return (
    <Suspense fallback={<ExpensesSkeleton />}>
      <ExpensesContent />
    </Suspense>
  );
}

function ExpensesContent() {
  const searchParams = useSearchParams();
  const activeTime = (searchParams.get("time") as ExpenseTimeFilter) || "all";
  const activeType = (searchParams.get("type") as ExpenseTypeFilter) || "all";
  const activeFrom = searchParams.get("from") ?? "";
  const activeTo = searchParams.get("to") ?? "";

  const apiParams = new URLSearchParams();
  if (activeTime !== "all") apiParams.set("time", activeTime);
  if (activeType !== "all") apiParams.set("type", activeType);
  if (activeTime === "custom") {
    if (activeFrom) apiParams.set("from", activeFrom);
    if (activeTo) apiParams.set("to", activeTo);
  }
  const qs = apiParams.toString();
  const apiUrl = qs ? `/api/expenses?${qs}` : "/api/expenses";
  const { data: expenses, refetch } = useApiGet<ExpenseDTO[]>(apiUrl);

  // Gate on the data itself, not `loading` — refetch() (after add/delete)
  // flips loading back to true while the old list is still valid, and
  // remounting the screen would close the open add/confirm sheet
  // mid-interaction.
  if (!expenses) return <ExpensesSkeleton />;

  return (
    <ExpensesScreen
      expenses={expenses}
      activeTime={activeTime}
      activeType={activeType}
      activeFrom={activeFrom}
      activeTo={activeTo}
      onChanged={refetch}
    />
  );
}

function ExpensesScreen({
  expenses,
  activeTime,
  activeType,
  activeFrom,
  activeTo,
  onChanged,
}: {
  expenses: ExpenseDTO[];
  activeTime: ExpenseTimeFilter;
  activeType: ExpenseTypeFilter;
  activeFrom: string;
  activeTo: string;
  onChanged: () => void;
}) {
  const router = useRouter();
  const today = vnDateKey(new Date());

  const [filterOpen, setFilterOpen] = useState(false);
  const [rangeOpen, setRangeOpen] = useState(false);
  const [fromInput, setFromInput] = useState(activeFrom || today);
  const [toInput, setToInput] = useState(activeTo || today);

  const [addOpen, setAddOpen] = useState(false);
  const [entryType, setEntryType] = useState<CashEntryType>("chi");
  const [name, setName] = useState("");
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const [confirmDelete, setConfirmDelete] = useState<ExpenseDTO | null>(null);
  const [deleting, setDeleting] = useState(false);

  const totalThu = useMemo(
    () => expenses.filter((e) => e.type === "thu").reduce((sum, e) => sum + e.amount, 0),
    [expenses],
  );
  const totalChi = useMemo(
    () => expenses.filter((e) => e.type === "chi").reduce((sum, e) => sum + e.amount, 0),
    [expenses],
  );

  function openAdd(type: CashEntryType) {
    setFormError(null);
    setEntryType(type);
    setName("");
    setAmount("");
    setNote("");
    setAddOpen(true);
  }

  async function handleSave() {
    setFormError(null);
    setSaving(true);
    const result = await apiMutate("/api/expenses", "POST", {
      name,
      amount: Number(amount),
      note: note || undefined,
      type: entryType,
    });
    setSaving(false);
    if ("error" in result) {
      setFormError(result.error);
      return;
    }
    setAddOpen(false);
    onChanged();
  }

  async function handleConfirmDelete() {
    if (!confirmDelete) return;
    setDeleting(true);
    await apiMutate(`/api/expenses/${confirmDelete.id}`, "DELETE");
    setDeleting(false);
    setConfirmDelete(null);
    onChanged();
  }

  function openRangePicker() {
    setFromInput(activeFrom || today);
    setToInput(activeTo || today);
    setRangeOpen(true);
  }

  function handleApplyRange() {
    setRangeOpen(false);
    setFilterOpen(false);
    router.push(expensesUrl({ time: "custom", type: activeType, from: fromInput, to: toInput }));
  }

  const activeFilterCount = activeTime !== "all" ? 1 : 0;

  return (
    <div className="flex flex-col">
      <div className="sticky top-0 z-[4] flex items-center gap-2.5 border-b border-line bg-white px-4 py-3">
        <div className="no-scrollbar flex flex-1 gap-2 overflow-x-auto">
          {TYPE_TABS.map((tab) => (
            <Link
              key={tab.value}
              href={expensesUrl({ time: activeTime, type: tab.value, from: activeFrom, to: activeTo })}
              className={`flex-none whitespace-nowrap rounded-full px-3.5 py-2 text-xs font-semibold ${
                tab.value === activeType
                  ? "bg-primary text-white shadow-md"
                  : "bg-primary-tint text-primary-dark"
              }`}
            >
              {tab.label}
            </Link>
          ))}
        </div>
        <button
          onClick={() => setFilterOpen(true)}
          className={`flex flex-none items-center gap-1.5 whitespace-nowrap rounded-full border px-3.5 py-2 text-xs font-semibold ${
            activeFilterCount > 0
              ? "border-primary bg-primary-tint text-primary-dark"
              : "border-line bg-white text-primary-dark"
          }`}
        >
          Bộ lọc{activeFilterCount > 0 ? ` · ${activeFilterCount}` : ""}
        </button>
      </div>

      <div className="flex flex-col gap-3 px-4 py-3.5">
      <div className="grid grid-cols-2 gap-2.5">
        <div className="flex flex-col gap-1 rounded-2xl border border-line bg-white p-3.5">
          <div className="text-[13px] text-muted">Tổng thu</div>
          <div className="text-lg font-extrabold text-paid">{formatVnd(totalThu)}</div>
        </div>
        <div className="flex flex-col gap-1 rounded-2xl border border-line bg-white p-3.5">
          <div className="text-[13px] text-muted">Tổng chi</div>
          <div className="text-lg font-extrabold text-[#3B5BDB]">{formatVnd(totalChi)}</div>
        </div>
      </div>

      <div className="flex gap-2.5">
        <button
          onClick={() => openAdd("thu")}
          className="flex-1 rounded-xl bg-paid py-3.5 text-[13px] font-bold text-white"
        >
          + Khoản thu
        </button>
        <button
          onClick={() => openAdd("chi")}
          className="flex-1 rounded-xl bg-primary py-3.5 text-[13px] font-bold text-white"
        >
          + Khoản chi
        </button>
      </div>

      <div className="flex flex-col gap-2">
        {expenses.length === 0 && (
          <div className="rounded-xl border border-line bg-white p-8 text-center text-sm text-muted">
            Chưa có khoản thu chi nào.
          </div>
        )}
        {expenses.map((expense) => (
          <div
            key={expense.id}
            className="flex items-center justify-between gap-3 rounded-2xl border border-line bg-white px-3.5 py-3"
          >
            <div className="flex flex-1 flex-col gap-0.5">
              <div className="flex items-center gap-1.5">
                <span
                  className={`flex-none rounded-full px-1.5 py-0.5 text-[9px] font-bold ${
                    expense.type === "thu" ? "bg-[#E6F6EC] text-paid" : "bg-primary-tint text-[#3B5BDB]"
                  }`}
                >
                  {expense.type === "thu" ? "Thu" : "Chi"}
                </span>
                <div className="text-[13px] font-semibold">{expense.name}</div>
              </div>
              <div className="text-[11px] text-muted">
                {formatOrderTime(expense.created_at)}
                {expense.note ? ` · ${expense.note}` : ""}
              </div>
            </div>
            <div
              className={`text-sm font-bold ${expense.type === "thu" ? "text-paid" : "text-[#3B5BDB]"}`}
            >
              {expense.type === "thu" ? "+" : "−"} {formatVnd(expense.amount)}
            </div>
            <button
              onClick={() => setConfirmDelete(expense)}
              className="rounded-lg border border-line px-2.5 py-1.5 text-[11px] font-semibold text-unpaid"
            >
              Xóa
            </button>
          </div>
        ))}
      </div>
      </div>

      <Sheet open={filterOpen} onClose={() => setFilterOpen(false)}>
        <div className="flex items-center justify-between">
          <div className="text-[15px] font-bold">Bộ lọc thu chi</div>
          <button onClick={() => setFilterOpen(false)} className="text-lg font-bold text-muted">
            ×
          </button>
        </div>

        <div className="flex flex-col gap-2">
          <div className="text-xs font-semibold text-muted">Thời gian</div>
          <div className="flex flex-wrap gap-2">
            {TIME_CHIPS.map((chip) => (
              <Link
                key={chip.value}
                href={expensesUrl({ time: chip.value, type: activeType })}
                className={`whitespace-nowrap rounded-full border px-3 py-1.5 text-xs font-semibold ${
                  chip.value === activeTime
                    ? "border-primary bg-primary-tint text-primary-dark"
                    : "border-line bg-white text-muted"
                }`}
              >
                {chip.label}
              </Link>
            ))}
            <button
              onClick={openRangePicker}
              className={`whitespace-nowrap rounded-full border px-3 py-1.5 text-xs font-semibold ${
                activeTime === "custom"
                  ? "border-primary bg-primary-tint text-primary-dark"
                  : "border-line bg-white text-muted"
              }`}
            >
              {activeTime === "custom" && activeFrom && activeTo
                ? formatDateRangeShort(activeFrom, activeTo)
                : "Tùy chọn"}
            </button>
          </div>
        </div>

        <div className="flex gap-2.5">
          <Link
            href={expensesUrl({ time: "all", type: activeType })}
            className="flex-1 rounded-xl bg-[#F1F0F3] py-3.5 text-center text-sm font-semibold text-ink"
          >
            Xóa lọc
          </Link>
          <button
            onClick={() => setFilterOpen(false)}
            className="flex-[1.4] rounded-xl bg-primary py-3.5 text-sm font-bold text-white"
          >
            Áp dụng
          </button>
        </div>
      </Sheet>

      <Sheet open={addOpen} onClose={() => setAddOpen(false)}>
        <div className="text-[15px] font-bold">
          {entryType === "thu" ? "Thêm khoản thu" : "Thêm khoản chi"}
        </div>
        <div className="flex gap-1 rounded-[11px] bg-page p-1">
          <button
            onClick={() => setEntryType("thu")}
            className={`flex-1 rounded-lg py-2 text-xs font-bold ${
              entryType === "thu" ? "bg-paid text-white" : "text-muted"
            }`}
          >
            Thu
          </button>
          <button
            onClick={() => setEntryType("chi")}
            className={`flex-1 rounded-lg py-2 text-xs font-bold ${
              entryType === "chi" ? "bg-primary text-white" : "text-muted"
            }`}
          >
            Chi
          </button>
        </div>
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-semibold text-muted">
            Nội dung {entryType === "thu" ? "thu" : "chi"}
          </label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={entryType === "thu" ? "VD: Thu tiền cho thuê mặt bằng..." : "VD: Nhập hàng, tiền điện..."}
            className="rounded-[10px] border border-line px-3 py-3 text-base"
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-semibold text-muted">Số tiền (Đ)</label>
          <input
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            inputMode="numeric"
            placeholder="VD: 200000"
            className="rounded-[10px] border border-line px-3 py-3 text-base"
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-semibold text-muted">Ghi chú (không bắt buộc)</label>
          <input
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="VD: Trả cho nhà cung cấp A"
            className="rounded-[10px] border border-line px-3 py-3 text-base"
          />
        </div>
        {formError && <p className="text-xs font-semibold text-unpaid">{formError}</p>}
        <button
          onClick={handleSave}
          disabled={saving || !name.trim() || !amount}
          className="rounded-xl bg-primary py-3.5 text-sm font-bold text-white disabled:opacity-60"
        >
          {saving ? "Đang lưu..." : entryType === "thu" ? "Lưu khoản thu" : "Lưu khoản chi"}
        </button>
      </Sheet>

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

      <Sheet open={confirmDelete !== null} onClose={() => setConfirmDelete(null)}>
        {confirmDelete && (
          <>
            <div className="text-[15px] font-bold">
              Xóa khoản {confirmDelete.type === "thu" ? "thu" : "chi"} này?
            </div>
            <p className="text-[13px] leading-relaxed text-muted">
              &quot;{confirmDelete.name}&quot; · {formatVnd(confirmDelete.amount)} sẽ được ẩn khỏi
              danh sách.
            </p>
            <button
              onClick={handleConfirmDelete}
              disabled={deleting}
              className="rounded-xl bg-unpaid py-3.5 text-sm font-bold text-white disabled:opacity-60"
            >
              {deleting ? "Đang xóa..." : "Xóa"}
            </button>
            <button
              onClick={() => setConfirmDelete(null)}
              className="rounded-xl border border-line py-3.5 text-sm font-semibold text-ink"
            >
              Giữ lại
            </button>
          </>
        )}
      </Sheet>
    </div>
  );
}

function ExpensesSkeleton() {
  return (
    <div className="flex flex-col">
      <div className="flex items-center gap-2.5 border-b border-line bg-white px-4 py-3">
        <div className="flex flex-1 gap-2">
          {Array.from({ length: 3 }, (_, i) => (
            <Skeleton key={i} className="h-8 w-16 flex-none rounded-full" />
          ))}
        </div>
        <Skeleton className="h-8 w-16 flex-none rounded-full" />
      </div>
      <div className="flex flex-col gap-3 px-4 py-3.5">
      <div className="grid grid-cols-2 gap-2.5">
        <Skeleton className="h-[70px] rounded-2xl" />
        <Skeleton className="h-[70px] rounded-2xl" />
      </div>
      <Skeleton className="h-[46px] rounded-xl" />
      <div className="flex flex-col gap-2">
        {Array.from({ length: 4 }, (_, i) => (
          <Skeleton key={i} className="h-[58px] rounded-2xl" />
        ))}
      </div>
      </div>
    </div>
  );
}
