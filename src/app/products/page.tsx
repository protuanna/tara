import { createClient } from "@/lib/supabase/server";
import { ProductsScreen } from "./products-screen";

export const dynamic = "force-dynamic";

export default async function ProductsPage() {
  const supabase = await createClient();

  const [{ data: categories }, { data: products }] = await Promise.all([
    supabase.from("categories").select("id, name").order("created_at"),
    supabase
      .from("products")
      .select("id, name, price, category_id, image_url")
      .order("created_at"),
  ]);

  return <ProductsScreen categories={categories ?? []} products={products ?? []} />;
}
