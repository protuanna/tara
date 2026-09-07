import { createClient } from "@/lib/supabase/server";

export type DebtorDTO = {
  customer_id: string | null;
  name: string | null;
  phone: string | null;
  debt: number | null;
};

export const debtService = {
  async list(): Promise<{ debtors: DebtorDTO[]; totalDebt: number }> {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("customer_debts")
      .select("customer_id, name, phone, debt")
      .gt("debt", 0)
      .order("debt", { ascending: false });
    if (error) throw error;

    const debtors = data ?? [];
    const totalDebt = debtors.reduce((sum, d) => sum + (d.debt ?? 0), 0);
    return { debtors, totalDebt };
  },
};
