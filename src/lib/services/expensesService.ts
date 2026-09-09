import { createClient } from "@/lib/supabase/server";
import { vnTodayStartIso, daysAgoIso, vnDateStartIso, vnDateEndExclusiveIso } from "@/lib/date";

export type ExpenseDTO = {
  id: string;
  name: string;
  amount: number;
  note: string | null;
  created_at: string;
};

export type ExpenseTimeFilter = "all" | "today" | "7d" | "30d" | "custom";

const TIME_VALUES: ExpenseTimeFilter[] = ["today", "7d", "30d", "custom"];
const DATE_KEY_RE = /^\d{4}-\d{2}-\d{2}$/;

export function parseExpenseTimeFilter(v: string | null): ExpenseTimeFilter {
  return v && TIME_VALUES.includes(v as ExpenseTimeFilter) ? (v as ExpenseTimeFilter) : "all";
}

export const expensesService = {
  async list(
    filters: { time: ExpenseTimeFilter; from?: string; to?: string } = { time: "all" },
  ): Promise<ExpenseDTO[]> {
    const supabase = await createClient();
    let query = supabase
      .from("expenses")
      .select("id, name, amount, note, created_at")
      .is("deleted_at", null)
      .order("created_at", { ascending: false });

    if (filters.time === "today") query = query.gte("created_at", vnTodayStartIso());
    else if (filters.time === "7d") query = query.gte("created_at", daysAgoIso(7));
    else if (filters.time === "30d") query = query.gte("created_at", daysAgoIso(30));
    else if (filters.time === "custom") {
      if (filters.from && DATE_KEY_RE.test(filters.from)) {
        query = query.gte("created_at", vnDateStartIso(filters.from));
      }
      if (filters.to && DATE_KEY_RE.test(filters.to)) {
        query = query.lt("created_at", vnDateEndExclusiveIso(filters.to));
      }
    }

    const { data, error } = await query;
    if (error) throw error;
    return data ?? [];
  },

  async create(input: {
    name: string;
    amount: number;
    note?: string;
  }): Promise<{ data: ExpenseDTO } | { error: string }> {
    const name = input.name.trim();
    if (!name) return { error: "Vui lòng nhập nội dung chi" };
    if (!Number.isFinite(input.amount) || input.amount <= 0) {
      return { error: "Vui lòng nhập số tiền hợp lệ" };
    }

    const supabase = await createClient();
    const { data, error } = await supabase
      .from("expenses")
      .insert({ name, amount: Math.round(input.amount), note: input.note?.trim() || null })
      .select("id, name, amount, note, created_at")
      .single();

    if (error) throw error;
    return { data };
  },

  /** Soft delete — marks the row deleted_at rather than removing it outright. */
  async remove(id: string): Promise<void> {
    const supabase = await createClient();
    const { error } = await supabase
      .from("expenses")
      .update({ deleted_at: new Date().toISOString() })
      .eq("id", id);
    if (error) throw error;
  },
};
