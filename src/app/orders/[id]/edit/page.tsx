"use client";

import { use, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useApiGet, apiMutate } from "@/lib/use-api";
import { formatVnd } from "@/lib/format";
import { calcTotals, type DiscountType } from "@/lib/pricing";
import { WALKIN_CUSTOMER_ID } from "@/lib/supabase/types";
import { Sheet } from "@/components/sheet";
import { Skeleton } from "@/components/skeleton";
import { FeePicker } from "@/components/fee-picker";
import type { OrderDetailDTO } from "@/lib/services/ordersService";
import type { CustomerDTO } from "@/lib/services/customersService";
import type { CategoryDTO } from "@/lib/services/categoriesService";
import type { ProductDTO } from "@/lib/services/productsService";

type Customer = { id: string; name: string; phone: string | null };
// `key` is stable per line (the order_item's own id for pre-existing lines,
// or the product's id for a freshly-added one) — `productId` can be null
// for a pre-existing line whose product was since deleted
// (order_items.product_id is `ON DELETE SET NULL`), so it can't double as
// the React key or the merge-by-product lookup.
type EditItem = { key: string; productId: string | null; name: string; price: number; qty: number };

export default function EditOrderPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { data: order, loading, error } = useApiGet<OrderDetailDTO>(`/api/orders/${id}`);
  const { data: customers, loading: loadingCustomers } = useApiGet<CustomerDTO[]>("/api/customers");
  const { data: categories, loading: loadingCategories } = useApiGet<CategoryDTO[]>("/api/categories");
  const { data: products, loading: loadingProducts } = useApiGet<ProductDTO[]>("/api/products");

  if (
    (loading && !order) ||
    (loadingCustomers && !customers) ||
    (loadingCategories && !categories) ||
    (loadingProducts && !products)
  ) {
    return <EditOrderSkeleton />;
  }

  if (error || !order) {
    return (
      <div className="flex flex-col items-center gap-3 px-6 pt-16 text-center">
        <div className="text-base font-bold">Không tìm thấy đơn hàng</div>
        <Link href="/orders" className="text-sm font-semibold text-primary-dark">
          Về danh sách đơn hàng
        </Link>
      </div>
    );
  }

  if (order.fulfillment_status !== "pending" && order.fulfillment_status !== "processing") {
    return (
      <div className="flex flex-col items-center gap-3 px-6 pt-16 text-center">
        <div className="text-base font-bold">Không thể sửa đơn này</div>
        <p className="text-sm text-muted">Chỉ có thể sửa đơn khi đang chờ xác nhận hoặc đang xử lý.</p>
        <Link href={`/orders/${order.id}`} className="text-sm font-semibold text-primary-dark">
          Về chi tiết đơn
        </Link>
      </div>
    );
  }

  return (
    <EditOrderScreen
      order={order}
      initialCustomers={customers ?? []}
      categories={categories ?? []}
      products={products ?? []}
    />
  );
}

function EditOrderScreen({
  order,
  initialCustomers,
  categories,
  products,
}: {
  order: OrderDetailDTO;
  initialCustomers: Customer[];
  categories: CategoryDTO[];
  products: ProductDTO[];
}) {
  const router = useRouter();

  // Hydrate local editable state from the order exactly once — this screen
  // never refetches the order after that, so there's no risk of stomping
  // in-progress edits with server data.
  const [items, setItems] = useState<EditItem[]>(() =>
    order.order_items.map((i) => ({
      key: i.id,
      productId: i.product_id,
      name: i.name,
      price: i.price,
      qty: i.qty,
    })),
  );
  const [customers, setCustomers] = useState<Customer[]>(initialCustomers);
  const [customerId, setCustomerId] = useState(order.customer_id);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [addingCustomer, setAddingCustomer] = useState(false);
  const [newName, setNewName] = useState("");
  const [newPhone, setNewPhone] = useState("");
  const [addCustomerError, setAddCustomerError] = useState<string | null>(null);

  const [productPickerOpen, setProductPickerOpen] = useState(false);
  const [pickerCategoryId, setPickerCategoryId] = useState<string | null>(categories[0]?.id ?? null);

  const [fee, setFee] = useState(order.fee > 0 ? String(order.fee) : "");
  const [discount, setDiscount] = useState(order.discount_amount > 0 ? String(order.discount_amount) : "");
  const [discountType, setDiscountType] = useState<DiscountType>("vnd");

  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const subtotal = useMemo(() => items.reduce((sum, i) => sum + i.price * i.qty, 0), [items]);
  const totals = useMemo(
    () => calcTotals(subtotal, Number(fee) || 0, Number(discount) || 0, discountType),
    [subtotal, fee, discount, discountType],
  );

  const selectedCustomer =
    customers.find((c) => c.id === customerId) ?? { id: WALKIN_CUSTOMER_ID, name: "Khách lẻ", phone: null };

  const filteredPickerProducts = useMemo(
    () => products.filter((p) => p.category_id === pickerCategoryId),
    [products, pickerCategoryId],
  );

  function incItem(key: string) {
    setItems((prev) => prev.map((i) => (i.key === key ? { ...i, qty: i.qty + 1 } : i)));
  }

  function decItem(key: string) {
    setItems((prev) => prev.map((i) => (i.key === key ? { ...i, qty: i.qty - 1 } : i)).filter((i) => i.qty > 0));
  }

  function addProduct(product: ProductDTO) {
    setItems((prev) => {
      const existing = prev.find((i) => i.productId === product.id);
      if (existing) return prev.map((i) => (i.productId === product.id ? { ...i, qty: i.qty + 1 } : i));
      return [
        ...prev,
        { key: product.id, productId: product.id, name: product.name, price: product.price, qty: 1 },
      ];
    });
  }

  async function handleAddCustomer() {
    setAddCustomerError(null);
    setAddingCustomer(true);
    const result = await apiMutate<Customer>("/api/customers", "POST", {
      name: newName,
      phone: newPhone || null,
    });
    setAddingCustomer(false);
    if ("error" in result) {
      setAddCustomerError(result.error);
      return;
    }
    setCustomers((prev) => [...prev, result.data]);
    setCustomerId(result.data.id);
    setNewName("");
    setNewPhone("");
    setPickerOpen(false);
  }

  async function handleSave() {
    if (items.length === 0) {
      setSaveError("Giỏ hàng trống");
      return;
    }
    setSaveError(null);
    setSaving(true);
    const result = await apiMutate<{ id: string }>(`/api/orders/${order.id}`, "PATCH", {
      customerId,
      items: items.map(({ productId, name, price, qty }) => ({ productId, name, price, qty })),
      fee: Number(fee) || 0,
      discount: Number(discount) || 0,
      discountType,
    });
    setSaving(false);
    if ("error" in result) {
      setSaveError(result.error);
      return;
    }
    router.push(`/orders/${order.id}`);
  }

  return (
    <div className="flex flex-col gap-3.5 px-4 pb-6 pt-3">
      <div className="flex items-center gap-2.5">
        <Link
          href={`/orders/${order.id}`}
          aria-label="Quay lại"
          className="flex size-[34px] flex-none items-center justify-center rounded-[11px] border border-line bg-white text-lg font-extrabold leading-none text-primary-dark"
        >
          ‹
        </Link>
        <div className="text-base font-extrabold">Sửa đơn</div>
      </div>

      <div className="flex flex-col gap-3 rounded-2xl border border-line bg-white p-3.5">
        <div className="flex items-center justify-between">
          <div className="text-[13px] font-bold">Sản phẩm trong đơn</div>
          <button
            onClick={() => setProductPickerOpen(true)}
            className="rounded-full border border-line px-3 py-1.5 text-xs font-bold text-primary-dark"
          >
            + Thêm sản phẩm
          </button>
        </div>
        {items.map((item) => (
          <div key={item.key} className="flex items-center justify-between gap-2.5">
            <div className="flex min-w-0 flex-col gap-0.5">
              <div className="text-[13px] font-semibold">{item.name}</div>
              <div className="text-xs text-muted">{formatVnd(item.price)}</div>
            </div>
            <div className="flex items-center gap-1.5 rounded-[10px] bg-primary-tint p-1">
              <button
                onClick={() => decItem(item.key)}
                className="flex size-7 items-center justify-center rounded-lg bg-white text-lg font-extrabold leading-none text-primary-dark"
              >
                −
              </button>
              <span className="min-w-[18px] text-center text-sm font-extrabold">{item.qty}</span>
              <button
                onClick={() => incItem(item.key)}
                className="flex size-7 items-center justify-center rounded-lg bg-primary text-lg font-extrabold leading-none text-white"
              >
                +
              </button>
            </div>
          </div>
        ))}
        {items.length === 0 && (
          <div className="rounded-xl bg-page p-3 text-center text-xs text-muted">
            Chưa có sản phẩm nào, hãy thêm ít nhất một sản phẩm.
          </div>
        )}
      </div>

      <div className="flex flex-col gap-3 rounded-2xl border border-line bg-white p-3.5">
        <div className="text-[13px] font-bold">Chi tiết thanh toán</div>
        <div className="flex justify-between text-[13px]">
          <span className="text-muted">Tiền hàng</span>
          <span className="font-bold">{formatVnd(subtotal)}</span>
        </div>
        <FeePicker value={fee} onChange={setFee} />
        <div className="flex flex-col gap-2">
          <label className="flex items-center gap-2.5">
            <span className="flex-1 text-[13px] text-muted">Giảm giá</span>
            <input
              value={discount}
              onChange={(e) => setDiscount(e.target.value)}
              inputMode="numeric"
              placeholder="0"
              className="w-[110px] rounded-[10px] border border-line px-2.5 py-2 text-right text-base font-bold text-ink"
            />
          </label>
          <div className="flex gap-1 rounded-[11px] bg-page p-1">
            <button
              onClick={() => setDiscountType("vnd")}
              className={`flex-1 rounded-lg py-2 text-xs font-bold ${
                discountType === "vnd" ? "bg-primary text-white" : "text-muted"
              }`}
            >
              Theo tiền (Đ)
            </button>
            <button
              onClick={() => setDiscountType("pct")}
              className={`flex-1 rounded-lg py-2 text-xs font-bold ${
                discountType === "pct" ? "bg-primary text-white" : "text-muted"
              }`}
            >
              Theo %
            </button>
          </div>
        </div>
        {totals.fee > 0 && (
          <div className="flex justify-between text-[13px]">
            <span className="text-muted">Phí vận chuyển</span>
            <span className="font-bold text-processing">+ {formatVnd(totals.fee)}</span>
          </div>
        )}
        {totals.discount > 0 && (
          <div className="flex justify-between text-[13px]">
            <span className="text-muted">Giảm giá</span>
            <span className="font-bold text-paid">− {formatVnd(totals.discount)}</span>
          </div>
        )}
        <div className="flex items-baseline justify-between border-t border-primary-tint pt-3">
          <span className="text-sm font-bold">Khách phải trả</span>
          <span className="text-lg font-extrabold text-primary-dark">{formatVnd(totals.total)}</span>
        </div>
      </div>

      <div className="flex flex-col gap-2.5 rounded-2xl border border-line bg-white p-3.5">
        <div className="text-[13px] font-bold">Khách hàng</div>
        <button
          onClick={() => setPickerOpen(true)}
          className="flex items-center gap-3 rounded-[14px] border border-line p-3"
        >
          <span className="flex size-[38px] flex-none items-center justify-center rounded-full bg-primary-tint text-[15px] font-extrabold text-primary-dark">
            {selectedCustomer.name.trim()[0]}
          </span>
          <span className="flex min-w-0 flex-1 flex-col gap-0.5 text-left">
            <span className="text-[13.5px] font-bold">{selectedCustomer.name}</span>
            <span className="text-[11.5px] text-muted">
              {selectedCustomer.id === WALKIN_CUSTOMER_ID
                ? "Không ghi sổ khách"
                : selectedCustomer.phone || "Chưa có SĐT"}
            </span>
          </span>
          <span className="flex-none text-xs font-bold text-primary-dark">Đổi ›</span>
        </button>
      </div>

      {saveError && <p className="text-sm font-semibold text-unpaid">{saveError}</p>}

      <button
        onClick={handleSave}
        disabled={saving}
        className="rounded-2xl bg-primary py-3.5 text-[14.5px] font-extrabold text-white disabled:opacity-60"
      >
        {saving ? "Đang lưu..." : `Lưu thay đổi → ${formatVnd(totals.total)}`}
      </button>

      <Sheet open={pickerOpen} onClose={() => setPickerOpen(false)}>
        <div className="text-[15px] font-bold">Chọn khách hàng</div>

        <div className="flex flex-col gap-2 rounded-[14px] border border-dashed border-primary-light p-3">
          <div className="text-xs font-bold text-primary-dark">Thêm khách hàng mới</div>
          <input
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="Tên khách"
            className="rounded-[10px] border border-line px-3 py-2 text-base"
          />
          <input
            value={newPhone}
            onChange={(e) => setNewPhone(e.target.value)}
            inputMode="tel"
            placeholder="Số điện thoại (không bắt buộc)"
            className="rounded-[10px] border border-line px-3 py-2 text-base"
          />
          {addCustomerError && <p className="text-xs font-semibold text-unpaid">{addCustomerError}</p>}
          <button
            onClick={handleAddCustomer}
            disabled={addingCustomer || !newName.trim()}
            className="rounded-lg bg-primary py-2 text-xs font-bold text-white disabled:opacity-60"
          >
            {addingCustomer ? "Đang thêm..." : "Thêm khách hàng"}
          </button>
        </div>

        <div className="flex flex-col gap-2">
          {customers.map((c) => (
            <button
              key={c.id}
              onClick={() => {
                setCustomerId(c.id);
                setPickerOpen(false);
              }}
              className={`flex items-center gap-3 rounded-[14px] border p-3 text-left ${
                c.id === customerId ? "border-primary bg-primary-tint" : "border-line bg-white"
              }`}
            >
              <span className="flex size-[38px] flex-none items-center justify-center rounded-full bg-primary-tint text-[15px] font-extrabold text-primary-dark">
                {c.name.trim()[0]}
              </span>
              <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                <span className="text-[13.5px] font-bold">{c.name}</span>
                <span className="text-[11.5px] text-muted">
                  {c.id === WALKIN_CUSTOMER_ID ? "Không ghi sổ khách" : c.phone || "Chưa có SĐT"}
                </span>
              </span>
              {c.id === customerId && <span className="flex-none text-[15px] font-extrabold text-primary-dark">✓</span>}
            </button>
          ))}
        </div>
      </Sheet>

      <Sheet open={productPickerOpen} onClose={() => setProductPickerOpen(false)}>
        <div className="text-[15px] font-bold">Thêm sản phẩm</div>
        <div className="no-scrollbar flex gap-2 overflow-x-auto pb-1">
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setPickerCategoryId(cat.id)}
              className={`flex-none whitespace-nowrap rounded-full px-3.5 py-2 text-xs font-semibold ${
                cat.id === pickerCategoryId ? "bg-primary text-white" : "border border-line bg-white text-ink"
              }`}
            >
              {cat.name}
            </button>
          ))}
        </div>
        <div className="flex flex-col gap-2">
          {filteredPickerProducts.map((product) => (
            <button
              key={product.id}
              onClick={() => addProduct(product)}
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
          {filteredPickerProducts.length === 0 && (
            <div className="rounded-xl bg-page p-3 text-center text-xs text-muted">
              Danh mục này chưa có sản phẩm.
            </div>
          )}
        </div>
      </Sheet>
    </div>
  );
}

function EditOrderSkeleton() {
  return (
    <div className="flex flex-col gap-3.5 px-4 pb-6 pt-3">
      <div className="flex items-center gap-2.5">
        <Skeleton className="size-[34px] rounded-[11px]" />
        <Skeleton className="h-5 w-24 rounded" />
      </div>
      <Skeleton className="h-[180px] rounded-2xl" />
      <Skeleton className="h-[220px] rounded-2xl" />
      <Skeleton className="h-[92px] rounded-2xl" />
      <Skeleton className="h-[54px] rounded-2xl" />
    </div>
  );
}
