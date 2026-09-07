import { createClient } from "@/lib/supabase/server";

export type ProductDTO = {
  id: string;
  name: string;
  price: number;
  category_id: string | null;
  image_url: string | null;
};

export const productsService = {
  async list(): Promise<ProductDTO[]> {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("products")
      .select("id, name, price, category_id, image_url")
      .order("created_at");
    if (error) throw error;
    return data ?? [];
  },

  async create(input: {
    name: string;
    price: number;
    categoryId: string;
  }): Promise<{ data: ProductDTO } | { error: string }> {
    const name = input.name.trim();
    if (!name) return { error: "Vui lòng nhập tên sản phẩm" };
    if (!Number.isFinite(input.price) || input.price <= 0) {
      return { error: "Vui lòng nhập giá bán hợp lệ" };
    }
    if (!input.categoryId) return { error: "Vui lòng chọn danh mục" };

    const supabase = await createClient();
    const { data, error } = await supabase
      .from("products")
      .insert({ name, price: Math.round(input.price), category_id: input.categoryId })
      .select("id, name, price, category_id, image_url")
      .single();

    if (error) throw error;
    return { data };
  },

  async remove(id: string): Promise<void> {
    const supabase = await createClient();
    const { error } = await supabase.from("products").delete().eq("id", id);
    if (error) throw error;
  },
};
