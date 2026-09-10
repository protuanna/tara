import { createClient } from "@/lib/supabase/server";
import { WALKIN_CUSTOMER_ID } from "@/lib/supabase/types";
import type { FulfillmentStatus } from "@/lib/supabase/types";

export type CustomerDTO = {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  avatarUrl: string | null;
  address: string | null;
  orderCount: number;
  totalSpent: number;
  debt: number;
};

type CustomerRow = {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  avatar_url: string | null;
  address: string | null;
  orders: { total: number; fulfillment_status: FulfillmentStatus }[];
};

export const customersService = {
  async list(): Promise<CustomerDTO[]> {
    const supabase = await createClient();

    const [{ data: customers, error: custErr }, { data: debts, error: debtErr }] =
      await Promise.all([
        supabase
          .from("customers")
          .select("id, name, phone, email, avatar_url, address, orders(total, fulfillment_status)")
          .neq("id", WALKIN_CUSTOMER_ID)
          .order("created_at")
          .returns<CustomerRow[]>(),
        supabase.from("customer_debts").select("customer_id, debt"),
      ]);
    if (custErr) throw custErr;
    if (debtErr) throw debtErr;

    const debtByCustomer = new Map((debts ?? []).map((d) => [d.customer_id, d.debt ?? 0]));

    return (customers ?? []).map((c) => {
      // Excludes cancelled orders but, unlike the Home revenue card, does
      // NOT exclude unpaid ones — "how much business this customer
      // represents," not revenue.
      const activeOrders = c.orders.filter((o) => o.fulfillment_status !== "cancel");
      return {
        id: c.id,
        name: c.name,
        phone: c.phone,
        email: c.email,
        avatarUrl: c.avatar_url,
        address: c.address,
        orderCount: activeOrders.length,
        totalSpent: activeOrders.reduce((sum, o) => sum + o.total, 0),
        debt: debtByCustomer.get(c.id) ?? 0,
      };
    });
  },

  async create(input: {
    name: string;
    phone: string | null;
  }): Promise<{ data: { id: string; name: string; phone: string | null } } | { error: string }> {
    const name = input.name.trim();
    if (!name) return { error: "Vui lòng nhập tên khách hàng" };

    const supabase = await createClient();
    const { data, error } = await supabase
      .from("customers")
      .insert({ name, phone: input.phone?.trim() || null })
      .select("id, name, phone")
      .single();

    if (error) throw error;
    return { data };
  },

  async update(
    id: string,
    input: { name: string; phone: string | null; address: string | null },
  ): Promise<
    | { data: { id: string; name: string; phone: string | null; address: string | null } }
    | { error: string }
  > {
    const name = input.name.trim();
    if (!name) return { error: "Vui lòng nhập tên khách hàng" };

    const supabase = await createClient();
    const { data, error } = await supabase
      .from("customers")
      .update({
        name,
        phone: input.phone?.trim() || null,
        address: input.address?.trim() || null,
      })
      .eq("id", id)
      .select("id, name, phone, address")
      .single();

    if (error) throw error;
    return { data };
  },

  /**
   * Mirrors collectDebt() from the design prototype — but since debt is
   * derived (see customer_debts view / migration 0001), "collecting" it
   * means flipping every one of the customer's payment_status='debt'
   * orders to 'paid', not resetting a counter.
   */
  async collectDebt(customerId: string): Promise<void> {
    const supabase = await createClient();
    const { error } = await supabase
      .from("orders")
      .update({ payment_status: "paid", payment_method: "cash" })
      .eq("customer_id", customerId)
      .eq("payment_status", "debt");
    if (error) throw error;
  },
};
