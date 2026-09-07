"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCart } from "@/lib/cart-context";
import { useApiGet } from "@/lib/use-api";
import { formatVnd } from "@/lib/format";
import { Sheet } from "@/components/sheet";
import { Skeleton } from "@/components/skeleton";
import type { CategoryDTO } from "@/lib/services/categoriesService";
import type { ProductDTO } from "@/lib/services/productsService";

export default function SalePage() {
  const { data: categories, loading: loadingCategories } = useApiGet<CategoryDTO[]>("/api/categories");
  const { data: products, loading: loadingProducts } = useApiGet<ProductDTO[]>("/api/products");

  if (loadingCategories || loadingProducts) return <SaleSkeleton />;

  return <SaleScreen categories={categories ?? []} products={products ?? []} />;
}

function SaleScreen({ categories, products }: { categories: CategoryDTO[]; products: ProductDTO[] }) {
  const router = useRouter();
  const cart = useCart();
  // "Tất cả" (undefined) shows every product; a real category id filters
  // to just that one — matches the /products screen's tab convention.
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | undefined>(undefined);
  const [cartSheetOpen, setCartSheetOpen] = useState(false);

  const filteredProducts = useMemo(
    () =>
      selectedCategoryId === undefined
        ? products
        : products.filter((p) => p.category_id === selectedCategoryId),
    [products, selectedCategoryId],
  );

  const cartQtyByProduct = useMemo(() => {
    const map = new Map<string, number>();
    for (const item of cart.items) map.set(item.productId, item.qty);
    return map;
  }, [cart.items]);

  if (categories.length === 0) {
    return (
      <div className="flex flex-col items-center gap-3 px-6 pt-16 text-center">
        <div className="text-base font-bold">Chưa có sản phẩm nào</div>
        <p className="text-sm text-muted">
          Thêm danh mục và sản phẩm ở trang Sản phẩm, hoặc chạy{" "}
          <code className="rounded bg-primary-tint px-1 py-0.5">
            supabase/seed.sql
          </code>{" "}
          để có dữ liệu mẫu.
        </p>
        <Link
          href="/products"
          className="rounded-full bg-primary px-4 py-2 text-sm font-semibold text-white"
        >
          Đi tới trang Sản phẩm
        </Link>
      </div>
    );
  }

  return (
    <div className="flex flex-col">
      <div className="flex gap-2 overflow-x-auto px-4 pb-2 pt-3.5">
        <button
          onClick={() => setSelectedCategoryId(undefined)}
          className={`flex-none whitespace-nowrap rounded-full px-3.5 py-2 text-xs font-semibold ${
            selectedCategoryId === undefined
              ? "bg-primary text-white"
              : "border border-line bg-white text-ink"
          }`}
        >
          Tất cả
        </button>
        {categories.map((cat) => (
          <button
            key={cat.id}
            onClick={() => setSelectedCategoryId(cat.id)}
            className={`flex-none whitespace-nowrap rounded-full px-3.5 py-2 text-xs font-semibold ${
              cat.id === selectedCategoryId
                ? "bg-primary text-white"
                : "border border-line bg-white text-ink"
            }`}
          >
            {cat.name}
          </button>
        ))}
        <Link
          href="/products"
          className="flex-none whitespace-nowrap rounded-full border border-dashed border-primary-light bg-white px-3.5 py-2 text-xs font-semibold text-primary-dark"
        >
          + Sản phẩm
        </Link>
      </div>

      <div className="grid grid-cols-2 gap-2.5 px-4 pb-4">
        {filteredProducts.map((product) => {
          const qty = cartQtyByProduct.get(product.id) ?? 0;
          return (
            <div
              key={product.id}
              onClick={() => cart.addItem(product)}
              className="flex cursor-pointer flex-col overflow-hidden rounded-[14px] border border-line bg-white"
            >
              <div className="relative flex h-[78px] items-center justify-center overflow-hidden bg-[#EBE7F1] text-2xl font-extrabold text-[#C4BCD3]">
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
              <div className="flex flex-col gap-2 p-2.5">
                <div className="text-[13px] font-semibold leading-tight">{product.name}</div>
                <div className="flex min-h-[30px] items-center justify-between gap-1.5">
                  <div className="text-[13px] font-bold text-primary-dark">
                    {formatVnd(product.price)}
                  </div>
                  {qty === 0 && (
                    <div className="flex size-7 flex-none items-center justify-center rounded-[9px] bg-primary-tint text-lg font-extrabold leading-none text-primary-dark">
                      +
                    </div>
                  )}
                </div>
                {qty > 0 && (
                  <div className="flex items-center justify-between gap-1.5 rounded-[10px] bg-primary-tint p-1">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        cart.decItem(product.id);
                      }}
                      className="flex size-7 flex-none items-center justify-center rounded-lg bg-white text-lg font-extrabold leading-none text-primary-dark"
                    >
                      −
                    </button>
                    <span className="text-sm font-extrabold">{qty}</span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        cart.incItem(product.id);
                      }}
                      className="flex size-7 flex-none items-center justify-center rounded-lg bg-primary text-lg font-extrabold leading-none text-white"
                    >
                      +
                    </button>
                  </div>
                )}
              </div>
            </div>
          );
        })}
        {filteredProducts.length === 0 && (
          <div className="col-span-2 rounded-xl border border-line bg-white p-4 text-center text-sm text-muted">
            Danh mục này chưa có sản phẩm.
          </div>
        )}
      </div>

      {cart.itemCount > 0 && (
        <div className="sticky bottom-3 px-4">
          <button
            onClick={() => setCartSheetOpen(true)}
            className="flex w-full items-center justify-between rounded-[14px] border border-line bg-white px-4 py-3.5 shadow-lg"
          >
            <div className="flex items-center gap-2.5">
              <span className="flex size-[26px] items-center justify-center rounded-lg bg-primary text-xs font-bold text-white">
                {cart.itemCount}
              </span>
              <span className="text-[13px] font-semibold">Xem đơn</span>
            </div>
            <span className="text-[15px] font-extrabold text-primary-dark">
              {formatVnd(cart.subtotal)}
            </span>
          </button>
        </div>
      )}

      <Sheet open={cartSheetOpen} onClose={() => setCartSheetOpen(false)}>
        <div className="text-[15px] font-bold">Đơn hàng</div>
        <div className="flex flex-col gap-2.5">
          {cart.items.map((item) => (
            <div key={item.productId} className="flex items-center justify-between">
              <div className="flex flex-col gap-0.5">
                <div className="text-[13px] font-semibold">{item.name}</div>
                <div className="text-xs text-muted">{formatVnd(item.price)}</div>
              </div>
              <div className="flex items-center gap-2.5">
                <button
                  onClick={() => cart.decItem(item.productId)}
                  className="flex size-[26px] items-center justify-center rounded-lg border border-line text-[15px] font-bold"
                >
                  −
                </button>
                <span className="min-w-[16px] text-center text-[13px] font-bold">{item.qty}</span>
                <button
                  onClick={() => cart.incItem(item.productId)}
                  className="flex size-[26px] items-center justify-center rounded-lg border border-line text-[15px] font-bold"
                >
                  +
                </button>
              </div>
            </div>
          ))}
        </div>
        <div className="flex justify-between border-t border-line pt-3">
          <span className="text-sm font-bold">Tổng cộng</span>
          <span className="text-lg font-extrabold text-primary-dark">
            {formatVnd(cart.subtotal)}
          </span>
        </div>
        <button
          onClick={() => {
            setCartSheetOpen(false);
            router.push("/checkout");
          }}
          className="rounded-xl bg-primary py-3.5 text-sm font-bold text-white"
        >
          Tiếp tục thanh toán
        </button>
      </Sheet>
    </div>
  );
}

function SaleSkeleton() {
  return (
    <div className="flex flex-col">
      <div className="flex gap-2 overflow-x-auto px-4 pb-2 pt-3.5">
        {Array.from({ length: 4 }, (_, i) => (
          <Skeleton key={i} className="h-9 w-24 flex-none rounded-full" />
        ))}
      </div>
      <div className="grid grid-cols-2 gap-2.5 px-4 pb-4">
        {Array.from({ length: 6 }, (_, i) => (
          <Skeleton key={i} className="h-[150px] rounded-[14px]" />
        ))}
      </div>
    </div>
  );
}
