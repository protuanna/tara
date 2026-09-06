import { createClient } from "@/lib/supabase/server";
import { DebtScreen } from "./debt-screen";

export const dynamic = "force-dynamic";

export default async function DebtPage() {
  const supabase = await createClient();

  const { data: debtors } = await supabase
    .from("customer_debts")
    .select("customer_id, name, phone, debt")
    .gt("debt", 0)
    .order("debt", { ascending: false });

  return <DebtScreen debtors={debtors ?? []} />;
}
