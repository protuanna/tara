"use server";

import { createClient } from "@/lib/supabase/server";

export type ActionResult = { ok: true } | { error: string };

export async function createCategory(name: string): Promise<ActionResult> {
  const trimmed = name.trim();
  if (!trimmed) return { error: "Vui lòng nhập tên danh mục" };

  const supabase = await createClient();
  const { error } = await supabase.from("categories").insert({ name: trimmed });

  if (error) {
    if (error.code === "23505") return { error: "Danh mục này đã tồn tại" };
    return { error: error.message };
  }
  return { ok: true };
}

export async function createProduct(input: {
  name: string;
  price: number;
  categoryId: string;
}): Promise<ActionResult> {
  const name = input.name.trim();
  if (!name) return { error: "Vui lòng nhập tên sản phẩm" };
  if (!Number.isFinite(input.price) || input.price <= 0) {
    return { error: "Vui lòng nhập giá bán hợp lệ" };
  }
  if (!input.categoryId) return { error: "Vui lòng chọn danh mục" };

  const supabase = await createClient();
  const { error } = await supabase.from("products").insert({
    name,
    price: Math.round(input.price),
    category_id: input.categoryId,
  });

  if (error) return { error: error.message };
  return { ok: true };
}

export async function deleteProduct(productId: string): Promise<ActionResult> {
  const supabase = await createClient();
  const { error } = await supabase.from("products").delete().eq("id", productId);
  if (error) return { error: error.message };
  return { ok: true };
}
