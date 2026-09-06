# Tara Shop – design prototype notes

Source: a self-contained HTML/JS prototype ("Tara Shop - So ban hang.html",
shared 2026-09-06) built with a proprietary preview bundler + mini template
engine (`sc-camel-*` attrs, `<sc-if>`, `<sc-for>`, `{{ }}` bindings, a
`DCLogic` base class). It is a **visual/behavioral mock**, not real app code —
do not try to run or port its template syntax directly. The extracted,
readable business logic lives in `tara-shop-prototype-logic.js` next to this
file; this doc covers screens, layout, and visual style.

## Product

Vietnamese-language mobile POS / sales-ledger app ("sổ bán hàng") for a small
shop. Single-column mobile layout, `max-width: 480px`, centered, with a
sticky bottom nav.

## Screens (single-page app, `tab` state machine)

- **home** – revenue-today card, debt summary, 4 quick-action tiles (Bán
  hàng/Sale, Xem đơn/Orders, Sản phẩm/Products, Khách hàng/Customers), recent
  orders list.
- **sale** – category chips + product grid (2 cols), tap to add to cart,
  qty stepper once in cart, floating cart summary bar → checkout.
- **checkout** (full-tab, reached from `sale`) – cart item list with qty
  steppers, "+ Thêm sản phẩm" opens a product-picker sheet, fee (phụ thu) and
  discount (giảm giá, toggle VND/%) inputs, customer picker (defaults to
  "Khách lẻ" / walk-in), Save.
- **orderView** – read-only order detail: items, subtotal/fee/discount/total,
  payment status; actions "Hủy đơn" (cancel) / "Đã giao" (mark delivered,
  opens a paid-vs-pay-later sheet) while `dstatus` is pending/processing; an
  edit (pencil) button opens **orderEdit**.
- **orderEdit** – same shape as checkout but mutates an existing order.
- **orders** – full order list with sticky filter bar: status tabs (Tất
  cả/Chờ xác nhận/Đang xử lý/Đã giao/Đã hủy) + a filter sheet (time range,
  payment status). Each row shows quick-action buttons for pending/processing
  orders.
- **products** – grouped by category, add product (with optional image
  upload, stored as a data-URL in the mock), add category, delete product.
- **customers** – list with per-customer order count/spend + debt badge; add
  customer sheet.
- **debt** ("Sổ nợ") – total-receivable card + list of customers with
  `debt > 0`; tapping opens a detail sheet with "Đã thu đủ nợ" (mark debt
  collected → resets to 0).
- **report** – period tabs (Hôm nay/7 ngày/30 ngày), revenue bar chart,
  order-count / avg-order-value / items-sold stat tiles, top-3 products by
  qty sold (progress bars), payment-method breakdown donut (cash/QR/debt).

Modals/sheets used across screens: product picker, customer picker, cancel
confirmation, deliver (paid vs. pay-later) confirmation, order-filter sheet,
add-product sheet, add-category sheet, add-customer sheet.

## Visual style (for translating to Tailwind/shadcn or similar)

- Primary purple `#8B6FC7` (darker `#6B4FA8`, tint `#F1EAFB`, light tint
  `#C3AEE6`); app background `#EDEAF2` / card surface `#F6F4F9` / white cards
  `#fff` with `#E7E3EE` borders.
- Status colors: pending `#B07908`/`#FFF6E0`, processing `#C25A0B`/`#FFF2E2`,
  done `#6B4FA8`/`#F1EAFB`, cancel `#7A7288`/`#F1F0F3`; paid `#2E9E5B`, debt
  `#C25A0B`, unpaid `#D64545`.
- Font: "Be Vietnam Pro" (Google Font), weights 400/500/600/700/800.
- Rounded cards (12–20px radius), bottom nav with a raised circular FAB
  ("Bán hàng") in the center, 5 items total (Trang chủ, Đơn hàng, [FAB] Bán
  hàng, Sổ nợ, Báo cáo).

## Data model to carry into Supabase

See `tara-shop-prototype-logic.js` for exact shapes/enums. Summary:

- `products`: id, name, price, category, image
- `categories`: name (currently just a string list)
- `customers`: id, name, phone, debt (derive `debt` from unpaid/ghi-nợ orders
  rather than storing it as a mutable counter, to avoid drift)
- `orders`: id, created_at, customer_id, items (or a line-items table),
  fulfillment status (`pending|processing|done|cancel`), payment status
  (`paid|debt|unpaid`), payment method (`cash|qr|debt|unpaid`), fee, discount
  (amount + type), total
- `order_items`: order_id, product_id, name/price snapshot, qty

Since the shop presumably wants durable order history, product price should
be **snapshotted onto the order line item** (as the mock already does)
rather than joined live to `products.price`.
