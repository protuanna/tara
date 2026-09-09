"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCart } from "@/lib/cart-context";
import { useApiGet, apiMutate } from "@/lib/use-api";
import { formatVnd } from "@/lib/format";
import { calcTotals } from "@/lib/pricing";
import { WALKIN_CUSTOMER_ID } from "@/lib/supabase/types";
import { Skeleton } from "@/components/skeleton";
import { FeePicker } from "@/components/fee-picker";
import { ToppingPicker } from "@/components/topping-picker";
import { DiscountPicker } from "@/components/discount-picker";
import { CustomerPicker } from "@/components/customer-picker";
import { ProductPicker } from "@/components/product-picker";
import type { CustomerDTO } from "@/lib/services/customersService";
import type { CategoryDTO } from "@/lib/services/categoriesService";
import type { ProductDTO } from "@/lib/services/productsService";

type Customer = { id: string; name: string; phone: string | null };

export default function CheckoutPage() {
  const { data: customers, loading: loadingCustomers } = useApiGet<CustomerDTO[]>("/api/customers");
  const { data: categories, loading: loadingCategories } = useApiGet<CategoryDTO[]>("/api/categories");
  const { data: products, loading: loadingProducts } = useApiGet<ProductDTO[]>("/api/products");

  if (loadingCustomers || loadingCategories || loadingProducts) return <CheckoutSkeleton />;

  return (
    <CheckoutScreen
      initialCustomers={customers ?? []}
      categories={categories ?? []}
      products={products ?? []}
    />
  );
}

function CheckoutScreen({
  initialCustomers,
  categories,
  products,
}: {
  initialCustomers: Customer[];
  categories: CategoryDTO[];
  products: ProductDTO[];
}) {
  const router = useRouter();
  const cart = useCart();

  const {
    customerId,
    setCustomerId,
    fee,
    setFee,
    topping,
    setTopping,
    discount,
    setDiscount,
    discountType,
    setDiscountType,
  } = cart;

  const [customers, setCustomers] = useState<Customer[]>(initialCustomers);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [productPickerOpen, setProductPickerOpen] = useState(false);

  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const productQtyById = useMemo(() => {
    const map = new Map<string, number>();
    for (const item of cart.items) map.set(item.productId, item.qty);
    return map;
  }, [cart.items]);

  const totals = useMemo(
    () =>
      calcTotals(
        cart.subtotal,
        Number(fee) || 0,
        Number(topping) || 0,
        Number(discount) || 0,
        discountType,
      ),
    [cart.subtotal, fee, topping, discount, discountType],
  );

  const selectedCustomer =
    customers.find((c) => c.id === customerId) ?? {
      id: WALKIN_CUSTOMER_ID,
      name: "Khách lẻ",
      phone: null,
    };

  if (cart.items.length === 0) {
    return (
      <div className="flex flex-col items-center gap-3 px-6 pt-16 text-center">
        <div className="text-base font-bold">Giỏ hàng trống</div>
        <p className="text-sm text-muted">Quay lại Bán hàng để chọn sản phẩm trước.</p>
        <Link
          href="/sale"
          className="rounded-full bg-primary px-4 py-2 text-sm font-semibold text-white"
        >
          Đi tới Bán hàng
        </Link>
      </div>
    );
  }

  async function handleSave() {
    setSaveError(null);
    setSaving(true);
    const result = await apiMutate<{ id: string }>("/api/orders", "POST", {
      customerId,
      items: cart.items.map((i) => ({
        productId: i.productId,
        name: i.name,
        price: i.price,
        qty: i.qty,
      })),
      fee: Number(fee) || 0,
      toppingFee: Number(topping) || 0,
      discount: Number(discount) || 0,
      discountType,
    });
    setSaving(false);
    if ("error" in result) {
      setSaveError(result.error);
      return;
    }
    cart.clear();
    router.push(`/orders/${result.data.id}`);
  }

  return (
    <div className="flex flex-col gap-3.5 px-4 pb-6 pt-3">
      <div className="flex items-center gap-2.5">
        <Link
          href="/sale"
          aria-label="Quay lại"
          className="flex size-[34px] flex-none items-center justify-center rounded-[11px] border border-line bg-white text-lg font-extrabold leading-none text-primary-dark"
        >
          ‹
        </Link>
        <div className="text-base font-extrabold">Thanh toán</div>
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
        {cart.items.map((item) => (
          <div key={item.productId} className="flex items-center justify-between gap-2.5">
            <div className="flex min-w-0 flex-col gap-0.5">
              <div className="text-[13px] font-semibold">{item.name}</div>
              <div className="text-xs text-muted">{formatVnd(item.price)}</div>
            </div>
            <div className="flex items-center gap-1.5 rounded-[10px] bg-primary-tint p-1">
              <button
                onClick={() => cart.decItem(item.productId)}
                className="flex size-7 items-center justify-center rounded-lg bg-white text-lg font-extrabold leading-none text-primary-dark"
              >
                −
              </button>
              <span className="min-w-[18px] text-center text-sm font-extrabold">{item.qty}</span>
              <button
                onClick={() => cart.incItem(item.productId)}
                className="flex size-7 items-center justify-center rounded-lg bg-primary text-lg font-extrabold leading-none text-white"
              >
                +
              </button>
            </div>
          </div>
        ))}
      </div>

      <div className="flex flex-col gap-3 rounded-2xl border border-line bg-white p-3.5">
        <div className="text-[13px] font-bold">Chi tiết thanh toán</div>
        <div className="flex justify-between text-[13px]">
          <span className="text-muted">Tiền hàng</span>
          <span className="font-bold">{formatVnd(cart.subtotal)}</span>
        </div>
        <FeePicker value={fee} onChange={setFee} />
        <ToppingPicker value={topping} onChange={setTopping} />
        <DiscountPicker
          value={discount}
          onChange={setDiscount}
          type={discountType}
          onTypeChange={setDiscountType}
        />
        {totals.fee > 0 && (
          <div className="flex justify-between text-[13px]">
            <span className="text-muted">Phí vận chuyển</span>
            <span className="font-bold text-processing">+ {formatVnd(totals.fee)}</span>
          </div>
        )}
        {totals.topping > 0 && (
          <div className="flex justify-between text-[13px]">
            <span className="text-muted">Topping</span>
            <span className="font-bold text-processing">+ {formatVnd(totals.topping)}</span>
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
          <span className="text-lg font-extrabold text-primary-dark">
            {formatVnd(totals.total)}
          </span>
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
        {saving ? "Đang lưu..." : `Lưu đơn → ${formatVnd(totals.total)}`}
      </button>

      <CustomerPicker
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        customers={customers}
        selectedId={customerId}
        onSelect={setCustomerId}
        onCustomerAdded={(c) => setCustomers((prev) => [...prev, c])}
      />

      <ProductPicker
        open={productPickerOpen}
        onClose={() => setProductPickerOpen(false)}
        categories={categories}
        products={products}
        quantities={productQtyById}
        onInc={cart.addItem}
        onDec={cart.decItem}
      />
    </div>
  );
}

function CheckoutSkeleton() {
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
