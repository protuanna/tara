"use client";

import { Suspense, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useApiGet, apiMutate } from "@/lib/use-api";
import { formatVnd } from "@/lib/format";
import { formatOrderTime, vnDateKey, formatDateRangeShort } from "@/lib/date";
import { Sheet } from "@/components/sheet";
import { Skeleton } from "@/components/skeleton";
import type { ExpenseDTO, ExpenseTimeFilter } from "@/lib/services/expensesService";

const PRESET_CHIPS: { value: ExpenseTimeFilter; label: string }[] = [
  { value: "all", label: "Tất cả thời gian" },
  { value: "today", label: "Hôm nay" },
  { value: "7d", label: "7 ngày" },
  { value: "30d", label: "30 ngày" },
];

function expensesUrl(time: ExpenseTimeFilter, range?: { from: string; to: string }): string {
  if (time === "custom" && range) {
    return `/expenses?time=custom&from=${range.from}&to=${range.to}`;
  }
  return time === "all" ? "/expenses" : `/expenses?time=${time}`;
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
  const activeFrom = searchParams.get("from") ?? "";
  const activeTo = searchParams.get("to") ?? "";

  const apiParams = new URLSearchParams();
  if (activeTime !== "all") apiParams.set("time", activeTime);
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
      activeFrom={activeFrom}
      activeTo={activeTo}
      onChanged={refetch}
    />
  );
}

function ExpensesScreen({
  expenses,
  activeTime,
  activeFrom,
  activeTo,
  onChanged,
}: {
  expenses: ExpenseDTO[];
  activeTime: ExpenseTimeFilter;
  activeFrom: string;
  activeTo: string;
  onChanged: () => void;
}) {
  const router = useRouter();
  const today = vnDateKey(new Date());

  const [rangeOpen, setRangeOpen] = useState(false);
  const [fromInput, setFromInput] = useState(activeFrom || today);
  const [toInput, setToInput] = useState(activeTo || today);
  const [addOpen, setAddOpen] = useState(false);
  const [name, setName] = useState("");
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const [confirmDelete, setConfirmDelete] = useState<ExpenseDTO | null>(null);
  const [deleting, setDeleting] = useState(false);

  const total = useMemo(() => expenses.reduce((sum, e) => sum + e.amount, 0), [expenses]);

  function openAdd() {
    setFormError(null);
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
    router.push(expensesUrl("custom", { from: fromInput, to: toInput }));
  }

  return (
    <div className="flex flex-col gap-3 px-4 py-3.5">
      <div className="no-scrollbar flex gap-2 overflow-x-auto">
        {PRESET_CHIPS.map((chip) => (
          <Link
            key={chip.value}
            href={expensesUrl(chip.value)}
            className={`flex-none whitespace-nowrap rounded-full px-3.5 py-2 text-xs font-semibold ${
              chip.value === activeTime
                ? "bg-primary text-white shadow-md"
                : "bg-primary-tint text-primary-dark"
            }`}
          >
            {chip.label}
          </Link>
        ))}
        <button
          onClick={openRangePicker}
          className={`flex-none whitespace-nowrap rounded-full px-3.5 py-2 text-xs font-semibold ${
            activeTime === "custom"
              ? "bg-primary text-white shadow-md"
              : "bg-primary-tint text-primary-dark"
          }`}
        >
          {activeTime === "custom" && activeFrom && activeTo
            ? formatDateRangeShort(activeFrom, activeTo)
            : "Tùy chọn"}
        </button>
      </div>

      <div className="flex items-center justify-between rounded-2xl border border-line bg-white p-4">
        <div className="text-[13px] text-muted">Tổng chi</div>
        <div className="text-xl font-extrabold text-[#3B5BDB]">{formatVnd(total)}</div>
      </div>

      <button
        onClick={openAdd}
        className="rounded-xl bg-primary py-3.5 text-[13px] font-bold text-white"
      >
        + Thêm khoản chi
      </button>

      <div className="flex flex-col gap-2">
        {expenses.length === 0 && (
          <div className="rounded-xl border border-line bg-white p-8 text-center text-sm text-muted">
            Chưa có khoản chi nào.
          </div>
        )}
        {expenses.map((expense) => (
          <div
            key={expense.id}
            className="flex items-center justify-between gap-3 rounded-2xl border border-line bg-white px-3.5 py-3"
          >
            <div className="flex flex-1 flex-col gap-0.5">
              <div className="text-[13px] font-semibold">{expense.name}</div>
              <div className="text-[11px] text-muted">
                {formatOrderTime(expense.created_at)}
                {expense.note ? ` · ${expense.note}` : ""}
              </div>
            </div>
            <div className="text-sm font-bold text-[#3B5BDB]">{formatVnd(expense.amount)}</div>
            <button
              onClick={() => setConfirmDelete(expense)}
              className="rounded-lg border border-line px-2.5 py-1.5 text-[11px] font-semibold text-unpaid"
            >
              Xóa
            </button>
          </div>
        ))}
      </div>

      <Sheet open={addOpen} onClose={() => setAddOpen(false)}>
        <div className="text-[15px] font-bold">Thêm khoản chi</div>
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-semibold text-muted">Nội dung chi</label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="VD: Nhập hàng, tiền điện..."
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
          {saving ? "Đang lưu..." : "Lưu khoản chi"}
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
            <div className="text-[15px] font-bold">Xóa khoản chi này?</div>
            <p className="text-[13px] leading-relaxed text-muted">
              &quot;{confirmDelete.name}&quot; · {formatVnd(confirmDelete.amount)} sẽ được ẩn khỏi
              danh sách chi.
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
    <div className="flex flex-col gap-3 px-4 py-3.5">
      <div className="flex gap-2">
        {Array.from({ length: 4 }, (_, i) => (
          <Skeleton key={i} className="h-8 w-20 flex-none rounded-full" />
        ))}
      </div>
      <Skeleton className="h-[64px] rounded-2xl" />
      <Skeleton className="h-[46px] rounded-xl" />
      <div className="flex flex-col gap-2">
        {Array.from({ length: 4 }, (_, i) => (
          <Skeleton key={i} className="h-[58px] rounded-2xl" />
        ))}
      </div>
    </div>
  );
}
