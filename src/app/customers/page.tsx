import { createClient } from "@/lib/supabase/server";
import { CustomersScreen } from "./customers-screen";
import { WALKIN_CUSTOMER_ID } from "@/lib/supabase/types";
import type { FulfillmentStatus } from "@/lib/supabase/types";

export const dynamic = "force-dynamic";

type CustomerRow = {
  id: string;
  name: string;
  phone: string | null;
  orders: { total: number; fulfillment_status: FulfillmentStatus }[];
};

export default async function CustomersPage() {
  const supabase = await createClient();

  const [{ data: customers }, { data: debts }] = await Promise.all([
    supabase
      .from("customers")
      .select("id, name, phone, orders(total, fulfillment_status)")
      .neq("id", WALKIN_CUSTOMER_ID)
      .order("created_at")
      .returns<CustomerRow[]>(),
    supabase.from("customer_debts").select("customer_id, debt"),
  ]);

  const debtByCustomer = new Map((debts ?? []).map((d) => [d.customer_id, d.debt ?? 0]));

  const items = (customers ?? []).map((c) => {
    // Matches the design: count/sum every non-cancelled order regardless of
    // payment status (unlike the revenue card, which also excludes unpaid).
    const activeOrders = c.orders.filter((o) => o.fulfillment_status !== "cancel");
    return {
      id: c.id,
      name: c.name,
      phone: c.phone,
      orderCount: activeOrders.length,
      totalSpent: activeOrders.reduce((sum, o) => sum + o.total, 0),
      debt: debtByCustomer.get(c.id) ?? 0,
    };
  });

  return <CustomersScreen customers={items} />;
}
