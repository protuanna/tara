import { createClient } from "@/lib/supabase/server";
import { SaleScreen } from "./sale-screen";

export const dynamic = "force-dynamic";

export default async function SalePage() {
  const supabase = await createClient();

  const [{ data: categories }, { data: products }] = await Promise.all([
    supabase.from("categories").select("id, name").order("created_at"),
    supabase
      .from("products")
      .select("id, name, price, category_id, image_url")
      .order("created_at"),
  ]);

  return <SaleScreen categories={categories ?? []} products={products ?? []} />;
}
