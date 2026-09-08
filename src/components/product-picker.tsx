"use client";

import { useState } from "react";
import { Sheet } from "@/components/sheet";
import { formatVnd } from "@/lib/format";
import type { CategoryDTO } from "@/lib/services/categoriesService";
import type { ProductDTO } from "@/lib/services/productsService";

/**
 * "Thêm sản phẩm" sheet for order-edit — same shape as `<CustomerPicker>`:
 * a search box over the already-loaded product list (no extra API call)
 * plus category chips as a quick filter when not searching. Selecting a
 * product doesn't close the sheet, so the cashier can add several in a row
 * (matches the previous category-tabs-only picker's behavior).
 */
export function ProductPicker({
  open,
  onClose,
  categories,
  products,
  onSelect,
}: {
  open: boolean;
  onClose: () => void;
  categories: CategoryDTO[];
  products: ProductDTO[];
  onSelect: (product: ProductDTO) => void;
}) {
  const [search, setSearch] = useState("");
  const [categoryId, setCategoryId] = useState<string | null>(null);

  const query = search.trim().toLowerCase();
  const filtered = query
    ? products.filter((p) => p.name.toLowerCase().includes(query))
    : products.filter((p) => categoryId === null || p.category_id === categoryId);

  function handleClose() {
    onClose();
    setSearch("");
    setCategoryId(null);
  }

  return (
    <Sheet open={open} onClose={handleClose}>
      <div className="text-[15px] font-bold">Thêm sản phẩm</div>

      <input
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Tìm sản phẩm..."
        className="rounded-[10px] border border-line px-3 py-2 text-base"
      />

      {!query && (
        <div className="no-scrollbar flex gap-2 overflow-x-auto pb-1">
          <button
            type="button"
            onClick={() => setCategoryId(null)}
            className={`flex-none whitespace-nowrap rounded-full px-3.5 py-2 text-xs font-semibold ${
              categoryId === null ? "bg-primary text-white" : "border border-line bg-white text-ink"
            }`}
          >
            Tất cả
          </button>
          {categories.map((cat) => (
            <button
              key={cat.id}
              type="button"
              onClick={() => setCategoryId(cat.id)}
              className={`flex-none whitespace-nowrap rounded-full px-3.5 py-2 text-xs font-semibold ${
                categoryId === cat.id ? "bg-primary text-white" : "border border-line bg-white text-ink"
              }`}
            >
              {cat.name}
            </button>
          ))}
        </div>
      )}

      <div className="flex flex-col gap-2 overflow-y-auto">
        {filtered.map((product) => (
          <button
            key={product.id}
            onClick={() => onSelect(product)}
            className="flex items-center justify-between gap-2.5 rounded-[14px] border border-line p-3 text-left"
          >
            <span className="text-[13px] font-semibold">{product.name}</span>
            <span className="flex items-center gap-2">
              <span className="text-[13px] font-bold text-primary-dark">{formatVnd(product.price)}</span>
              <span className="flex size-7 flex-none items-center justify-center rounded-lg bg-primary-tint text-lg font-extrabold leading-none text-primary-dark">
                +
              </span>
            </span>
          </button>
        ))}
        {filtered.length === 0 && (
          <p className="py-6 text-center text-sm text-muted">Không tìm thấy sản phẩm.</p>
        )}
      </div>
    </Sheet>
  );
}
