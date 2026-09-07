"use client";

import { useMemo, useState } from "react";
import { useApiGet, apiMutate } from "@/lib/use-api";
import { formatVnd } from "@/lib/format";
import { Sheet } from "@/components/sheet";
import { Skeleton } from "@/components/skeleton";
import type { CategoryDTO } from "@/lib/services/categoriesService";
import type { ProductDTO } from "@/lib/services/productsService";

export default function ProductsPage() {
  const { data: categories, refetch: refetchCategories } = useApiGet<CategoryDTO[]>("/api/categories");
  const { data: products, refetch: refetchProducts } = useApiGet<ProductDTO[]>("/api/products");

  // Gate on the data itself, not the loading flags — refetch() (after
  // add/delete) flips loading back to true while the old lists are still
  // valid, and remounting <ProductsScreen> would close any open sheet.
  if (!categories || !products) return <ProductsSkeleton />;

  return (
    <ProductsScreen
      categories={categories}
      products={products}
      onCategoriesChanged={refetchCategories}
      onProductsChanged={refetchProducts}
    />
  );
}

function ProductsScreen({
  categories,
  products,
  onCategoriesChanged,
  onProductsChanged,
}: {
  categories: CategoryDTO[];
  products: ProductDTO[];
  onCategoriesChanged: () => void;
  onProductsChanged: () => void;
}) {
  const [addProductOpen, setAddProductOpen] = useState(false);
  const [productName, setProductName] = useState("");
  const [productPrice, setProductPrice] = useState("");
  const [productCategoryId, setProductCategoryId] = useState<string | null>(
    categories[0]?.id ?? null,
  );
  const [savingProduct, setSavingProduct] = useState(false);
  const [productError, setProductError] = useState<string | null>(null);

  const [addCategoryOpen, setAddCategoryOpen] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [savingCategory, setSavingCategory] = useState(false);
  const [categoryError, setCategoryError] = useState<string | null>(null);

  const [deletingId, setDeletingId] = useState<string | null>(null);

  const groups = useMemo(() => {
    return categories.map((cat) => ({
      category: cat,
      items: products.filter((p) => p.category_id === cat.id),
    }));
  }, [categories, products]);

  const uncategorized = useMemo(
    () =>
      products.filter(
        (p) => p.category_id === null || !categories.some((c) => c.id === p.category_id),
      ),
    [products, categories],
  );

  function openAddProduct(categoryId: string | null) {
    setProductError(null);
    setProductName("");
    setProductPrice("");
    setProductCategoryId(categoryId ?? categories[0]?.id ?? null);
    setAddProductOpen(true);
  }

  async function handleSaveProduct() {
    setProductError(null);
    if (!productCategoryId) {
      setProductError("Vui lòng thêm danh mục trước");
      return;
    }
    setSavingProduct(true);
    const result = await apiMutate("/api/products", "POST", {
      name: productName,
      price: Number(productPrice),
      categoryId: productCategoryId,
    });
    setSavingProduct(false);
    if ("error" in result) {
      setProductError(result.error);
      return;
    }
    setAddProductOpen(false);
    onProductsChanged();
  }

  async function handleSaveCategory() {
    setCategoryError(null);
    setSavingCategory(true);
    const result = await apiMutate("/api/categories", "POST", { name: newCategoryName });
    setSavingCategory(false);
    if ("error" in result) {
      setCategoryError(result.error);
      return;
    }
    setNewCategoryName("");
    setAddCategoryOpen(false);
    onCategoriesChanged();
  }

  async function handleDelete(product: ProductDTO) {
    if (!window.confirm(`Xóa "${product.name}"?`)) return;
    setDeletingId(product.id);
    await apiMutate(`/api/products/${product.id}`, "DELETE");
    setDeletingId(null);
    onProductsChanged();
  }

  return (
    <div className="flex flex-col gap-4 px-4 py-3.5">
      <div className="flex gap-2.5">
        <button
          onClick={() => openAddProduct(null)}
          className="flex-1 rounded-xl bg-primary py-3.5 text-[13px] font-bold text-white"
        >
          + Thêm sản phẩm
        </button>
        <button
          onClick={() => {
            setCategoryError(null);
            setNewCategoryName("");
            setAddCategoryOpen(true);
          }}
          className="flex-1 rounded-xl border border-line bg-white py-3.5 text-[13px] font-semibold text-ink"
        >
          + Thêm danh mục
        </button>
      </div>

      {categories.length === 0 && (
        <div className="rounded-xl border border-line bg-white p-4 text-center text-sm text-muted">
          Chưa có danh mục nào — bấm &quot;+ Thêm danh mục&quot; trước khi thêm sản phẩm.
        </div>
      )}

      {groups.map(({ category, items }) => (
        <div key={category.id} className="flex flex-col gap-2">
          <div className="flex items-baseline justify-between">
            <div className="text-sm font-bold">{category.name}</div>
            <button
              onClick={() => openAddProduct(category.id)}
              className="text-xs font-semibold text-primary-dark"
            >
              + Thêm vào đây
            </button>
          </div>
          <div className="text-[11px] text-muted">{items.length} món</div>
          <div className="flex flex-col overflow-hidden rounded-2xl border border-line bg-white">
            {items.length === 0 && (
              <div className="p-3.5 text-center text-xs text-muted">Chưa có sản phẩm nào.</div>
            )}
            {items.map((product) => (
              <div
                key={product.id}
                className="flex items-center gap-3 border-b border-primary-tint p-3 last:border-b-0"
              >
                <div className="relative flex size-10 flex-none items-center justify-center overflow-hidden rounded-[10px] bg-[#EBE7F1] text-base font-extrabold text-[#C4BCD3]">
                  {product.image_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={product.image_url}
                      alt={product.name}
                      className="absolute inset-0 size-full object-cover"
                    />
                  ) : (
                    product.name.trim()[0]
                  )}
                </div>
                <div className="flex flex-1 flex-col gap-0.5">
                  <div className="text-[13px] font-semibold">{product.name}</div>
                  <div className="text-[13px] font-bold text-primary-dark">
                    {formatVnd(product.price)}
                  </div>
                </div>
                <button
                  onClick={() => handleDelete(product)}
                  disabled={deletingId === product.id}
                  className="rounded-lg border border-line px-2.5 py-1.5 text-[11px] font-semibold text-unpaid disabled:opacity-60"
                >
                  {deletingId === product.id ? "..." : "Xóa"}
                </button>
              </div>
            ))}
          </div>
        </div>
      ))}

      {uncategorized.length > 0 && (
        <div className="flex flex-col gap-2">
          <div className="text-sm font-bold">Chưa phân loại</div>
          <div className="flex flex-col overflow-hidden rounded-2xl border border-line bg-white">
            {uncategorized.map((product) => (
              <div
                key={product.id}
                className="flex items-center gap-3 border-b border-primary-tint p-3 last:border-b-0"
              >
                <div className="flex size-10 flex-none items-center justify-center rounded-[10px] bg-[#EBE7F1] text-base font-extrabold text-[#C4BCD3]">
                  {product.name.trim()[0]}
                </div>
                <div className="flex flex-1 flex-col gap-0.5">
                  <div className="text-[13px] font-semibold">{product.name}</div>
                  <div className="text-[13px] font-bold text-primary-dark">
                    {formatVnd(product.price)}
                  </div>
                </div>
                <button
                  onClick={() => handleDelete(product)}
                  disabled={deletingId === product.id}
                  className="rounded-lg border border-line px-2.5 py-1.5 text-[11px] font-semibold text-unpaid disabled:opacity-60"
                >
                  {deletingId === product.id ? "..." : "Xóa"}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      <Sheet open={addProductOpen} onClose={() => setAddProductOpen(false)}>
        <div className="text-[15px] font-bold">Thêm sản phẩm</div>
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-semibold text-muted">Tên sản phẩm</label>
          <input
            value={productName}
            onChange={(e) => setProductName(e.target.value)}
            placeholder="VD: Trà đào cam sả"
            className="rounded-[10px] border border-line px-3 py-3 text-base"
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-semibold text-muted">Giá bán (Đ)</label>
          <input
            value={productPrice}
            onChange={(e) => setProductPrice(e.target.value)}
            inputMode="numeric"
            placeholder="VD: 35000"
            className="rounded-[10px] border border-line px-3 py-3 text-base"
          />
        </div>
        <div className="flex flex-col gap-2">
          <label className="text-xs font-semibold text-muted">Danh mục</label>
          <div className="flex flex-wrap gap-2">
            {categories.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setProductCategoryId(cat.id)}
                className={`whitespace-nowrap rounded-full border px-3.5 py-2 text-xs font-semibold ${
                  cat.id === productCategoryId
                    ? "border-primary bg-primary text-white"
                    : "border-line bg-white text-ink"
                }`}
              >
                {cat.name}
              </button>
            ))}
          </div>
        </div>
        {productError && <p className="text-xs font-semibold text-unpaid">{productError}</p>}
        <button
          onClick={handleSaveProduct}
          disabled={savingProduct || !productName.trim() || !productPrice}
          className="rounded-xl bg-primary py-3.5 text-sm font-bold text-white disabled:opacity-60"
        >
          {savingProduct ? "Đang lưu..." : "Lưu sản phẩm"}
        </button>
      </Sheet>

      <Sheet open={addCategoryOpen} onClose={() => setAddCategoryOpen(false)}>
        <div className="text-[15px] font-bold">Thêm danh mục</div>
        <input
          value={newCategoryName}
          onChange={(e) => setNewCategoryName(e.target.value)}
          placeholder="VD: Trà sữa"
          className="rounded-[10px] border border-line px-3 py-3 text-base"
        />
        {categoryError && <p className="text-xs font-semibold text-unpaid">{categoryError}</p>}
        <button
          onClick={handleSaveCategory}
          disabled={savingCategory || !newCategoryName.trim()}
          className="rounded-xl bg-primary py-3.5 text-sm font-bold text-white disabled:opacity-60"
        >
          {savingCategory ? "Đang lưu..." : "Lưu danh mục"}
        </button>
      </Sheet>
    </div>
  );
}

function ProductsSkeleton() {
  return (
    <div className="flex flex-col gap-4 px-4 py-3.5">
      <div className="flex gap-2.5">
        <Skeleton className="h-[46px] flex-1 rounded-xl" />
        <Skeleton className="h-[46px] flex-1 rounded-xl" />
      </div>
      {Array.from({ length: 2 }, (_, g) => (
        <div key={g} className="flex flex-col gap-2">
          <Skeleton className="h-4 w-24 rounded" />
          <div className="flex flex-col gap-2 overflow-hidden rounded-2xl border border-line bg-white p-3">
            {Array.from({ length: 2 }, (_, i) => (
              <Skeleton key={i} className="h-[56px] rounded-xl" />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
