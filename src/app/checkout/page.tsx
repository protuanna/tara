import { createClient } from "@/lib/supabase/server";
import { CheckoutScreen } from "./checkout-screen";

export const dynamic = "force-dynamic";

export default async function CheckoutPage() {
  const supabase = await createClient();
  const { data: customers } = await supabase
    .from("customers")
    .select("id, name, phone")
    .order("created_at");

  return <CheckoutScreen customers={customers ?? []} />;
}
