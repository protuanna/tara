"use client";

import { useMemo, useState } from "react";
import { formatVnd } from "@/lib/format";
import { normalizeSearchText } from "@/lib/search";
import type { CategoryDTO } from "@/lib/services/categoriesService";
import type { ProductDTO } from "@/lib/services/productsService";

/**
 * "Thêm sản phẩm" full-screen view for order-edit — same product-grid tile
 * UI as `/sale` (image/initial box, name, price, and a qty stepper that
 * replaces the "+" once a product's in the order) rather than a plain list,
 * so a product already added is visually obvious instead of requiring the
 * cashier to remember or scroll back to the order summary to check. No
 * search box — category tabs are the only filter. The tabs (and the
 * bottom "Tiếp tục" button) are separate `flex-none` rows outside the
 * scrollable grid, the same three-part header/content/footer skeleton the
 * root app shell itself uses — not `position: sticky` on a row inside the
 * scroll area, which turned out unreliable nested inside this component's
 * own `fixed` full-screen overlay: the tabs would still scroll out of view
 * once "Tất cả" pushed the grid past one screen. Structural flex layout
 * guarantees the tabs and the continue button stay put regardless. The
 * search box (added later) follows the same rule as `<CustomerPicker>`'s:
 * category tabs hide while there's search text, since they're two ways to
 * filter the same list and showing both at once is redundant. Renders
 * as a `position: fixed` full-viewport overlay (same page, no route
 * change) capped to the app's own `max-w-[480px]` mobile-width column
 * (like the root shell in layout.tsx), not a bare `inset-0` box, so it
 * matches the rest of the design instead of stretching edge-to-edge on
 * anything wider than a phone. This component just toggles visibility via
 * `open`, it never unmounts the caller, so the order-edit screen's own
 * local item-list state is never at risk of being lost.
 */
export function ProductPicker({
  open,
  onClose,
  categories,
  products,
  quantities,
  onInc,
  onDec,
}: {
  open: boolean;
  onClose: () => void;
  categories: CategoryDTO[];
  products: ProductDTO[];
  /** Current qty already in the order, keyed by product id. */
  quantities: Map<string, number>;
  onInc: (product: ProductDTO) => void;
  onDec: (productId: string) => void;
}) {
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  const totalQty = useMemo(
    () => Array.from(quantities.values()).reduce((sum, qty) => sum + qty, 0),
    [quantities],
  );

  if (!open) return null;

  const query = normalizeSearchText(search.trim());
  const filtered = query
    ? products.filter((p) => normalizeSearchText(p.name).includes(query))
    : products.filter((p) => categoryId === null || p.category_id === categoryId);

  function handleClose() {
    onClose();
    setCategoryId(null);
    setSearch("");
  }

  return (
    <div className="fixed inset-0 z-30 flex justify-center bg-page">
      <div className="flex h-dvh w-full max-w-[480px] flex-col bg-surface">
        <div className="flex flex-none items-center gap-2.5 border-b border-line bg-white px-4 py-3">
          <button
            onClick={handleClose}
            aria-label="Quay lại"
            className="flex size-[34px] flex-none items-center justify-center rounded-[11px] border border-line bg-white text-lg font-extrabold leading-none text-primary-dark"
          >
            ‹
          </button>
          <div className="text-base font-extrabold">Thêm sản phẩm</div>
        </div>

        <div className="flex-none border-b border-line bg-surface px-4 py-3">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Tìm sản phẩm..."
            className="w-full rounded-[10px] border border-line bg-white px-3 py-3 text-base"
          />
        </div>

        {!query && (
          <div className="no-scrollbar flex flex-none gap-2 overflow-x-auto border-b border-line bg-surface px-4 py-3">
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
                  categoryId === cat.id
                    ? "bg-primary text-white"
                    : "border border-line bg-white text-ink"
                }`}
              >
                {cat.name}
              </button>
            ))}
          </div>
        )}

        <div className="flex-1 overflow-y-auto px-4 py-3.5">
          <div className="grid grid-cols-2 gap-2.5">
            {filtered.map((product) => {
              const qty = quantities.get(product.id) ?? 0;
              return (
                <div
                  key={product.id}
                  onClick={() => onInc(product)}
                  className="flex cursor-pointer flex-col overflow-hidden rounded-[14px] border border-line bg-white"
                >
                  <div className="relative flex h-[78px] items-center justify-center overflow-hidden bg-[#EBE7F1] text-2xl font-extrabold text-[#C4BCD3]">
                    {product.image_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={product.image_url}
                        alt={product.name}
                        className="absolute inset-0 size-full object-contain"
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
                            onDec(product.id);
                          }}
                          className="flex size-7 flex-none items-center justify-center rounded-lg bg-white text-lg font-extrabold leading-none text-primary-dark"
                        >
                          −
                        </button>
                        <span className="text-sm font-extrabold">{qty}</span>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onInc(product);
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
            {filtered.length === 0 && (
              <p className="col-span-2 py-6 text-center text-sm text-muted">
                Không tìm thấy sản phẩm.
              </p>
            )}
          </div>
        </div>

        <div className="flex-none border-t border-line bg-white px-4 py-3">
          <button
            onClick={handleClose}
            className="w-full rounded-xl bg-primary py-3.5 text-sm font-bold text-white"
          >
            {totalQty > 0 ? `Tiếp tục (${totalQty} sản phẩm)` : "Tiếp tục"}
          </button>
        </div>
      </div>
    </div>
  );
}
