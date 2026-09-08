"use client";

import { createContext, useContext, useMemo, useState } from "react";
import type { ReactNode } from "react";
import type { DiscountType } from "@/lib/pricing";
import { WALKIN_CUSTOMER_ID } from "@/lib/supabase/types";

export type CartItem = {
  productId: string;
  name: string;
  price: number;
  qty: number;
};

type CartContextValue = {
  items: CartItem[];
  itemCount: number;
  subtotal: number;
  addItem: (product: { id: string; name: string; price: number }) => void;
  incItem: (productId: string) => void;
  decItem: (productId: string) => void;
  clear: () => void;
  // Checkout draft fields — live here (not local state in /checkout) so
  // they survive navigating away to /sale to add another product and back;
  // /checkout is a fresh mount each time, but this provider, mounted once
  // in the root layout, isn't.
  customerId: string;
  setCustomerId: (id: string) => void;
  fee: string;
  setFee: (v: string) => void;
  topping: string;
  setTopping: (v: string) => void;
  discount: string;
  setDiscount: (v: string) => void;
  discountType: DiscountType;
  setDiscountType: (t: DiscountType) => void;
};

const CartContext = createContext<CartContextValue | null>(null);

/**
 * In-memory only (React state) — survives client-side navigation between
 * /sale and /checkout (both live under the root layout, which never
 * unmounts), but is lost on a full page reload. Acceptable for now; if that
 * turns out to be a problem in practice, persist to localStorage or a
 * `draft_orders` table rather than reaching for a heavier state library.
 */
export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [customerId, setCustomerId] = useState(WALKIN_CUSTOMER_ID);
  const [fee, setFee] = useState("");
  const [topping, setTopping] = useState("");
  const [discount, setDiscount] = useState("");
  const [discountType, setDiscountType] = useState<DiscountType>("vnd");

  const addItem: CartContextValue["addItem"] = (product) => {
    setItems((prev) => {
      const existing = prev.find((i) => i.productId === product.id);
      if (existing) {
        return prev.map((i) =>
          i.productId === product.id ? { ...i, qty: i.qty + 1 } : i,
        );
      }
      return [
        ...prev,
        { productId: product.id, name: product.name, price: product.price, qty: 1 },
      ];
    });
  };

  const incItem = (productId: string) => {
    setItems((prev) =>
      prev.map((i) => (i.productId === productId ? { ...i, qty: i.qty + 1 } : i)),
    );
  };

  const decItem = (productId: string) => {
    setItems((prev) =>
      prev
        .map((i) => (i.productId === productId ? { ...i, qty: i.qty - 1 } : i))
        .filter((i) => i.qty > 0),
    );
  };

  const clear = () => {
    setItems([]);
    setCustomerId(WALKIN_CUSTOMER_ID);
    setFee("");
    setTopping("");
    setDiscount("");
    setDiscountType("vnd");
  };

  const { itemCount, subtotal } = useMemo(
    () =>
      items.reduce(
        (acc, i) => ({
          itemCount: acc.itemCount + i.qty,
          subtotal: acc.subtotal + i.price * i.qty,
        }),
        { itemCount: 0, subtotal: 0 },
      ),
    [items],
  );

  const value: CartContextValue = {
    items,
    itemCount,
    subtotal,
    addItem,
    incItem,
    decItem,
    clear,
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
  };

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used within a CartProvider");
  return ctx;
}
