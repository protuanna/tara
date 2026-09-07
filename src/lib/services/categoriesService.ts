import { createClient } from "@/lib/supabase/server";

export type CategoryDTO = { id: string; name: string };

export const categoriesService = {
  async list(): Promise<CategoryDTO[]> {
    const supabase = await createClient();
    const { data, error } = await supabase.from("categories").select("id, name").order("created_at");
    if (error) throw error;
    return data ?? [];
  },

  async create(name: string): Promise<{ data: CategoryDTO } | { error: string }> {
    const trimmed = name.trim();
    if (!trimmed) return { error: "Vui lòng nhập tên danh mục" };

    const supabase = await createClient();
    const { data, error } = await supabase
      .from("categories")
      .insert({ name: trimmed })
      .select("id, name")
      .single();

    if (error) {
      if (error.code === "23505") return { error: "Danh mục này đã tồn tại" };
      throw error;
    }
    return { data };
  },
};
