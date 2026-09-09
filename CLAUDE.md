# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this app is

"Tara Shop" — a Vietnamese-language mobile-first POS / sales-ledger app
("sổ bán hàng") for a small shop: sell products, track orders through a
fulfillment + payment lifecycle, track customer debt (ghi nợ), and show
revenue/reporting. Stack: **Next.js (App Router)** on **Node 22**, deployed
on **Vercel**, with **Supabase** (Postgres) as the backend. Single-tenant,
**no auth/login** — one shop, one anon key, RLS policies are wide open by
design (see Architecture below) rather than scoped per-user.

All 8 screens from `docs/design/` are implemented: **Home** (`/`), the
**Sale flow** (browse `/sale` → checkout `/checkout` → confirmation
`/orders/[id]`, with `/orders/[id]/edit` to amend a pending/processing order
in place), **Orders** (`/orders`, list + status/time/payment filters +
cancel/mark-delivered), **Products** (`/products`, category tabs including
an "Tất cả" one, add category, add/delete product — no image upload yet, see
below), **Debt** (`/debt`, "Sổ nợ" —
total receivable + per-customer collect action), **Customers**
(`/customers`, list + add + per-customer detail with order stats and
collect-debt), and **Report** (`/report`, period tabs + four stats: doanh
thu kỳ này, tổng tiền hàng, tổng thu, tổng chi — see "Thu Chi" below for
the ninth screen, `/expenses`, added after the original 8). There's no
test suite —
every screen above was verified by hand against a live Supabase project
(seed data in, hit the route, check the rendered numbers, clean up), not
just "it builds." Do the same when changing business logic: a type-check
passing doesn't mean the query/filter/calculation is actually correct.

**Data flow: every screen is a Client Component that calls an API route.**
This was a deliberate rewrite (mirroring the structure of a prior project,
`bizmail-client-next`) away from an earlier version where pages were Server
Components querying Supabase directly during SSR. The current shape:

- `src/lib/services/*.ts` — the actual Supabase queries/business logic, one
  file per resource (`ordersService`, `productsService`, etc.), exported via
  `src/lib/services/index.ts`. This is the only layer allowed to import
  `src/lib/supabase/server.ts`.
- `src/app/api/**/route.ts` — thin HTTP handlers: parse the request, call a
  service method, return `NextResponse.json({ data })` on success or use
  `badRequest()` / `notFound()` / `handleRouteError()` from `src/lib/api.ts`
  on failure. Collection routes (`/api/orders`) hold GET (list) + POST
  (create); `[id]/route.ts` holds single-resource GET/DELETE; state-changing
  sub-actions get their own nested route (`/api/orders/[id]/cancel`,
  `/api/orders/[id]/deliver`, `/api/customers/[id]/collect-debt`) rather than
  overloading a generic PATCH — mirrors bizmail's `campaign/[id]/pause`
  convention. Every JSON response is `{ data: T }` or `{ error, message,
  statusCode }` — never a bare array/object — client code depends on that
  shape.
- `src/lib/use-api.ts` — `useApiGet<T>(url)` (fetch + loading/error state,
  `refetch()` to force a reload) and `apiMutate<T>(url, method, body)` for
  POST/DELETE, both client-side. Pages call these instead of doing
  `fetch()`/`useEffect` inline — there is no React Query despite it not
  being installed (bizmail-client-next has it as a dependency too but
  doesn't actually use it anywhere; plain fetch+state is the real pattern
  there and here).
- No Server Actions anywhere in this app anymore — every write goes through
  a POST/DELETE route + `apiMutate`, not a `"use server"` function.

**Gotcha that actually bit us, verified by hand, not just reasoned about:**
gate a page's loading skeleton on `!data` (or `!order`, etc.), **never** on
the hook's `loading` flag alone. `refetch()` sets `loading` back to `true`
while the previous `data` is still sitting there — a page that does `if
(loading) return <Skeleton />` will unmount its whole content tree (closing
any open `<Sheet>`, losing local state) every single time a mutation
completes and calls `refetch()`. Confirmed with Playwright: clicking "Lưu
danh mục" inside a `<Sheet>` on `/products` re-triggered the categories
fetch, which under the old `if (loading)` gate flashed the screen back to
its skeleton mid-interaction. Every screen here now gates on the data
itself; keep that pattern for anything new.

Follow the existing patterns for any further work (new field, new screen,
etc.): add a service method → add/extend a route → call it via `useApiGet`/
`apiMutate` from a Client Component. Filters still live in URL search
params (`useSearchParams()` + `<Link>`, wrapped in `<Suspense>` — Next
requires that for any component calling `useSearchParams()`), not client
state — see `/orders` and `/report`.

This rewrite was verified against a real running dev server + Playwright
(the `webapp-testing` skill), not just build/lint — clicked through
Sale→Checkout→Save→Order-detail in a real headless browser and confirmed
every screen's network requests actually hit `/api/*`. Two things worth
knowing if you do this again: (1) in this sandboxed environment, Playwright
needs the Bash tool's sandbox disabled to reach `localhost` at all (plain
`curl` works fine without it — only the browser subprocess's own networking
is affected); (2) a broad/ambiguous Playwright selector (e.g. "click the
first button matching 'Xóa'") can and did delete a real seed product
instead of the intended test one — when scripting destructive UI actions
against real Supabase data, scope selectors precisely (by row/container,
not just visible text) or point mutations at data you created in that same
script run and can identify by id.

## Commands

Requires **Node 22+** (`.nvmrc` pins `22`; `nvm use` before installing). The
Tailwind v4 / eslint 9 toolchain here has native deps that silently fail to
install on older Node — if `npm run build` errors with `Cannot find module
'./tailwindcss-oxide.*.node'`, you're on the wrong Node version; switch and
run `rm -rf node_modules package-lock.json && npm install`.

- `npm run dev` — dev server (Turbopack)
- `npm run build` — production build (also runs typecheck + lint as part of
  the Next.js build step)
- `npm start` — serve a production build
- `npm run lint` — ESLint only

No test runner is configured yet.

### Supabase

1. Copy `.env.local.example` to `.env.local` and fill in
   `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY` from the
   Supabase project's API settings. `SUPABASE_SERVICE_ROLE_KEY` is
   server-only and only needed for admin/seed scripts that must bypass RLS.
2. Apply the migrations under `supabase/migrations/` **in order** to the
   project (via the Supabase SQL editor, or `supabase db push` if using the
   Supabase CLI linked to this project). There's no Supabase CLI project
   link or migration-tracking table set up yet, so "already applied" isn't
   tracked anywhere — check the dashboard's table editor before re-running.
   Optionally also run `supabase/seed.sql` for demo categories/products (the
   same ones from the design prototype) so the Sale screen has something to
   show — it's plain `INSERT`s, safe to run via the anon/service key too,
   not just the SQL editor.
3. Use `src/lib/supabase/client.ts` (`createClient()`) from Client
   Components and `src/lib/supabase/server.ts` (`createClient()`, async)
   from Server Components/Server Actions/Route Handlers — they are separate
   modules because the server one reads/writes cookies per-request and must
   not be cached or shared.

## Design reference

`docs/design/` contains the UI/UX + business-rules spec extracted from a
shared prototype export, since the prototype itself isn't runnable code
(built with a proprietary preview-bundler template syntax, not React/Next):

- `tara-shop-prototype-notes.md` — screen-by-screen walkthrough, navigation
  flow, modal/sheet inventory, color palette, and the data model.
- `tara-shop-prototype-logic.js` — the actual business rules extracted
  verbatim from the prototype: seed data shapes, the `calcTotals` pricing
  formula (subtotal + fee − discount, discount by VND or %), and the order
  lifecycle state machine (fulfillment status: pending/processing/done/
  cancel, payment status: paid/debt/unpaid, and exactly how deliver /
  cancel / collect-debt mutate order and customer-debt state).

Read both before implementing any order/checkout/debt/report screen — the
lifecycle rules (e.g. which combination of fulfillment+payment status counts
toward revenue, when a customer's debt is incremented) are easy to get
subtly wrong without them.

## Branding

App icon / favicon / share-image / "Add to Home Screen" assets are all
generated from `docs/design/brand/tara-logo-1024.png` (a red-gradient
"TARA" wordmark + coffee-leaf mark — a different, newer brand asset than
the purple UI palette in `globals.css`/`docs/design/tara-shop-prototype-notes.md`;
the in-app color scheme hasn't been updated to match, only the
icon/favicon/manifest/OG-image layer has). Regenerate with `sips` (no other
image tooling is installed) if the source logo changes:

- `src/app/icon.png` (512×512) and `src/app/apple-icon.png` (180×180) —
  Next's Metadata File Conventions auto-detect these, no manual `<link>`
  tags needed.
- `src/app/favicon.ico` (48×48) — legacy fallback.
- `src/app/opengraph-image.png` (1200×630) — square logo centered on a
  `#BD4D41` padded background (sampled from the logo's own average color);
  auto-detected the same way for link-preview `og:image`.
- `public/icons/icon-{192,512}.png` — referenced by `src/app/manifest.ts`
  (the PWA manifest; `theme_color`/icons here use the new red brand, while
  `background_color` matches the app's actual purple-theme page background
  so the splash screen doesn't jar against the real UI underneath it).
- `metadataBase` in `layout.tsx` falls back to `http://localhost:3000` via
  `NEXT_PUBLIC_SITE_URL` — set that env var (in Vercel too) once the real
  domain is known, or share links will resolve `og:image` to localhost.

## Architecture

- `src/lib/supabase/types.ts` is a **hand-written** `Database` type mirrored
  from `supabase/migrations/*.sql`. If you change the schema, update this
  file too (or regenerate with `supabase gen types typescript` once the
  project is linked to a live Supabase instance) — it's currently the only
  source of DB types, there's no CI check keeping them in sync. Each
  table/view needs its full `Row`/`Insert`/`Update`/`Relationships` shape
  (with the schema-level `Functions`/`Enums`/`CompositeTypes` keys present,
  even if empty) — trimming any of that makes `@supabase/postgrest-js`'s
  generics silently resolve embedded-select results (`select("*, foo(bar)")`)
  to `never` instead of erroring, which is easy to misdiagnose.
- `order_items` snapshots product `name`/`price` at time of sale rather than
  joining live against `products` (matches the prototype), so editing a
  product's price later doesn't rewrite historical orders.
- There is no mutable "customer debt" column. `customer_debts` (a SQL view)
  derives each customer's debt by summing `orders.total` where
  `payment_status = 'debt'`. "Collecting" a debt means flipping those
  orders' `payment_status` to `'paid'` — implemented in
  `customersService.collectDebt()`, called from
  `POST /api/customers/[id]/collect-debt` — not decrementing a counter.
  `ordersService.markPaid()` (`POST /api/orders/[id]/pay`,
  `<CollectOrderPayment>` in `src/components/collect-order-payment.tsx`) is
  the per-order counterpart — settles just *one* debt order instead of
  every debt order a customer has. Only valid for `fulfillment_status =
  "done"` and `payment_status = "debt"` (checked server-side); shows up as
  a "Thanh toán đơn hàng" button on both the `/orders` list row and
  `/orders/[id]` detail page wherever that combination holds, same
  row/page `variant` + preventDefault-in-a-Link pattern as
  `<OrderStatusActions>`. Sets `payment_method = "cash"`, same assumption
  `deliver(id, true)` makes ("the shop just collected it in person");
  doesn't touch `fulfillment_status`, which is already `"done"` here.
- A walk-in customer ("Khách lẻ") is a real row in `customers`
  (`WALKIN_CUSTOMER_ID` in `types.ts`), not a null `customer_id`, so every
  order always has a customer to join against. Unlike the design prototype
  (which only tracked debt for a real, non-walk-in customer, since there'd
  be no one to bill later), this app's `ordersService.deliver()` marks
  "pay later" as debt for walk-in orders too (migration `0003`, which
  dropped `customer_debts`' old `where c.id <> <WALKIN_CUSTOMER_ID>` filter)
  — the shop still gave away unpaid goods and wants that reflected in
  "Tổng phải thu"/Sổ nợ, even though it can't be attributed to a named
  person; it all lands on the "Khách lẻ" row as one lump sum, collectible
  the same way as any other customer's debt.
- `customers` also has `email`/`avatar_url`/`address` (migration `0012`),
  added specifically to receive data migrated from the shop's old POS
  (sobanhang.com) — none of the app's own flows write them yet, the "+ Thêm
  khách hàng" quick-add sheet still only collects name/phone by design (see
  `<CustomerPicker>`'s own note on why it stays minimal). They're read-only
  display fields for now: `/customers`' list rows and detail sheet, and
  `<CustomerPicker>`, render `avatar_url` as a real photo in place of the
  letter-circle when present (same "just store/render the URL, no upload
  flow" shape as `products.image_url`); the detail sheet also shows
  email/address when non-empty. If a future screen ever lets someone *edit*
  these, go through `customersService` rather than writing `customers`
  directly.
- A newly-saved order gets `fulfillment_status: "processing"` directly, not
  the `"pending"` column default — that's what the design prototype's
  `saveOrder()` does, so `ordersService.create()` sets it explicitly. Don't
  rely on the DB default for this column.
- The cart (`src/lib/cart-context.tsx`, `CartProvider`) is **in-memory React
  state only**, mounted once in the root layout so it survives client-side
  navigation between `/sale` and `/checkout` — but a hard refresh loses it.
  If that becomes a real problem, persist it (localStorage or a
  `draft_orders` table) rather than reaching for a state library; don't
  duplicate cart logic per-screen. `CartProvider` also owns the checkout
  *draft* fields (`customerId`, `fee`, `topping`, `discount`,
  `discountType`) for the same reason as the items themselves: `/checkout`'s
  "+ Thêm sản phẩm" button navigates to `/sale` and back, remounting
  `/checkout` fresh each time, so anything kept as local `useState` inside
  that page (as these fields originally were) got silently wiped by that
  round trip. `clear()` resets all of them together, called once after a
  successful `POST /api/orders` in `handleSave()`.
- `<CustomerPicker>` (`src/components/customer-picker.tsx`) is the shared
  "chọn khách hàng" sheet for checkout and order-edit — a client-side
  search box over the already-loaded customer list (no extra API call) plus
  an "+ Thêm khách mới" toggle that only reveals the add-customer mini-form
  when tapped, rather than always showing it above the list.
- `<ProductPicker>` (`src/components/product-picker.tsx`) is the shared
  "Thêm sản phẩm" full-screen view for **both** checkout and order-edit —
  `/sale`'s own product browsing (the sale-flow's own grid) is the only
  screen with a separate implementation of this same tile UI, kept apart
  because it also owns the persistent-cart plumbing `<ProductPicker>`
  doesn't need. Grid-of-tiles layout (image/initial box, name, price, a qty
  stepper that replaces the "+" once a product's in the order), category
  tabs as a quick filter, plus a search box over the already-loaded product
  list (no extra API call) — same "hide the category tabs while there's
  search text" rule as `<CustomerPicker>`, since they're two ways to filter
  the same list. Selecting a product doesn't close the view, so the cashier
  can add several in a row; the header/tabs/search row and the bottom
  "Tiếp tục" button are separate `flex-none` rows around the scrollable
  grid (not `position: sticky` inside it — that turned out unreliable
  nested inside this component's own `fixed` full-screen overlay once the
  grid grew past one screen).
- `ordersService.create()` recomputes totals server-side via `calcTotals()`
  from the raw cart/fee/discount — never trust a client-submitted total.
  It's also **not transactional**: it inserts the order then its
  `order_items`, and best-effort deletes the order if the items insert
  fails, rather than using a real DB transaction (supabase-js has no
  multi-statement transaction API). A `create_order` Postgres RPC would fix
  that properly if it ever matters.
- `/orders/[id]/edit` mirrors the design prototype's `startEdit()`/
  `saveEdit()` — "same shape as checkout but mutates an existing order." The
  edit icon (`PencilIcon`) only appears on `/orders/[id]` while
  `fulfillment_status` is `pending`/`processing` (same `canDeliver` guard as
  cancel/deliver); `ordersService.update()` re-checks that server-side too
  (never trust the client not to hit the route directly on a done/cancelled
  order). It's a `PATCH /api/orders/[id]` (on the resource route itself,
  unlike cancel/deliver's nested sub-action routes, since this edits the
  order's actual content rather than flipping a lifecycle state) and, like
  `create()`, recomputes totals server-side via `calcTotals()` and replaces
  `order_items` wholesale (delete + re-insert) rather than diffing — same
  non-transactional caveat. The edit screen keeps its own local item-list
  state seeded once from the loaded order (never re-synced from a refetch,
  since there isn't one until Save navigates away) and does **not** touch
  the global `CartProvider` — reusing that cart would corrupt whatever the
  user has queued up on `/sale` for a *new* sale. Its own "+ Thêm sản phẩm"
  is a self-contained category/product-picker `<Sheet>` fetching
  `/api/categories` + `/api/products` directly, not the `/sale` screen.
  `OrderDetailDTO.order_items` carries `product_id` (nullable —
  `ON DELETE SET NULL` — a line's product may have been deleted since the
  sale) specifically so edit can round-trip it; each edit-screen line is
  keyed by the order_item's own `id` (or the product's `id` for a
  freshly-added line), never by `product_id` itself, since a pre-existing
  line can have a null one.
- Checkout and `/orders/[id]/edit` both show three surcharge/discount
  controls in the same shape: `<FeePicker>` ("Phí vận chuyển": 0Đ / 5.000Đ /
  10.000Đ / 20.000Đ), `<ToppingPicker>` ("Topping": 0Đ / 10.000Đ), and
  `<DiscountPicker>` ("Giảm giá", VNĐ or %). The two preset pickers are thin
  wrappers around the shared `<AmountPicker label presets value onChange>`
  (`src/components/amount-picker.tsx`) — preset chips plus a "Khác" chip
  that reveals a free-entry input; adding a third "X preset picker" later
  means adding another one-line wrapper around `<AmountPicker>`, not
  copy-pasting the chip/input markup again. All three are pure presentation
  over string state the screens already had (`fee`/`topping`/`discount`);
  no schema/service coupling beyond feeding `calcTotals()`. Each picker's
  "show the custom input" state is seeded once from its incoming value
  (`> 0` and not one of its own presets — this still works for
  `<ToppingPicker>` even though `0` is itself a valid preset, since the
  `> 0` guard means a blank/zero field never force-opens custom mode) and
  then only driven by the user's own chip clicks — don't make it re-derive
  from `value` on every render, or it'll fight someone typing in the custom
  field. `<DiscountPicker>` puts its label, amount input (`w-[130px]`), and
  VNĐ/% toggle (fixed `w-[100px]`, split evenly) on one row, pushed to the
  row's right edge via `justify-between`; `<AmountPicker>`'s custom-amount
  `<input>` matches that same 130+8+100=238px width and right alignment, so
  every row's right-aligned control lines up as one visual block.
  `topping_fee` (migration `0006`) is additive alongside `fee` in
  `calcTotals()` (`total = subtotal + fee + topping - discount`, and the
  VNĐ discount cap now includes it too) — a deliberate app-specific
  extension of the design prototype's formula, which never had a topping
  concept.
- Focused `<input>`/`<textarea>`/`<select>` elements get a 1px purple
  outline (`outline: 1px solid var(--color-primary)` in `globals.css`,
  unlayered like the 16px font-size rule) instead of the browser's default
  (wider, blue) focus ring — recolored and thinned, not removed, to keep
  the accessibility benefit of a visible focus indicator. The header search
  input (`.header-search-input` in `site-header.tsx`) opts out of it
  entirely (`input.header-search-input:focus { outline: none; }`, which
  wins on selector specificity) since it's a borderless rounded pill on a
  colored bar, not a bordered form field like the rest of the app — a hard
  focus outline there looks like a stray box rather than a focus state.
- Order lifecycle mutations (`ordersService.cancel()` /
  `ordersService.deliver()`, exposed as `POST /api/orders/[id]/cancel` and
  `POST /api/orders/[id]/deliver`) and their confirm sheets are one shared
  component, `<OrderStatusActions orderId paymentStatus onChanged variant="row"|"page">`
  (`src/components/order-status-actions.tsx`), used on both the `/orders`
  list rows and the `/orders/[id]` detail page — don't reimplement
  cancel/deliver UI a third time, extend that component. `deliver()` looks
  the order's `customer_id` up server-side itself (not trusted from the
  client) to decide paid vs. debt vs. unpaid; it doesn't touch
  `customer_debts` directly (that view derives from `payment_status`, see
  below). `onChanged` is the caller's `refetch` — always pass one, and see
  the loading-gate gotcha above for why the receiving page must not gate its
  skeleton on raw `loading`. `paymentStatus === "paid"` here can only mean
  "paid online via payOS before the shop delivered" (see
  `markPaidViaWebhook()` — there's no other path to `payment_status =
  "paid"` while `fulfillment_status` is still pending/processing), and
  `<OrderStatusActions>` treats that as a distinct state: the "Hủy đơn"
  button is hidden entirely (the money's already been received; this app
  has no refund flow, so `ordersService.cancel()` also rejects it
  server-side even if a client somehow calls the route directly), and "Đã
  giao" skips the paid-vs-pay-later choice — `ordersService.deliver()`
  ignores the `paid` argument when the order is already paid and only
  flips `fulfillment_status` to `"done"`, leaving `payment_method` as
  `"qr"` rather than stomping it back to `"cash"`.
- `/orders` and `/report` read their filters (`status`/`time`/`pay`,
  `period`) from **URL search params** via `useSearchParams()` (wrapped in
  `<Suspense>`), not client state — every filter chip/tab is a plain
  `<Link>` to a new query string (see `ordersUrl()` in `orders/page.tsx`).
  This keeps filtering shareable/bookmarkable; the page still re-fetches via
  `useApiGet` when the URL changes, it just doesn't hold the filter values
  in local state.
- Status/payment label + color maps (`FULFILLMENT_LABEL`, `PAYMENT_LABEL`,
  `PAYMENT_METHOD_LABEL`) live in `src/lib/order-labels.ts` — shared by the
  order detail page and the orders list. Add to that file rather than
  redefining these maps per screen.
- `/products` has **no image upload** — `products.image_url` exists in the
  schema and both the Sale grid and Products list already render it when
  present, but nothing writes it yet (the design prototype just stored a
  base64 data URL in memory, which doesn't translate to a real backend).
  Adding it for real means wiring up Supabase Storage (a bucket + upload
  policy), not just a `<input type="file">` — don't try to fake it with a
  data URL in the `products` table.
- There's no "delete category" action (matching the design, which never
  offered one either) — `products.category_id` is nullable with `ON DELETE
  SET NULL`, so the schema tolerates it, but the only way to remove a
  category today is directly in the DB. `ProductsScreen` already renders an
  "Chưa phân loại" (uncategorized) group defensively for that case.
- `POST /api/customers` (used by both `/checkout`'s inline "add customer"
  and `/customers`) and `POST /api/customers/[id]/collect-debt` (used by
  both `/customers` and `/debt`) are the same endpoints called from
  multiple screens — don't duplicate "add a customer" or "mark debt
  collected" logic client-side, just call the existing route. One
  deliberate deviation from the prototype: it reuses the *same* debt-only
  sheet for every customer row regardless of whether they owe anything;
  `/customers`' detail sheet always shows order-count/total-spent stats and
  only shows the debt card + collect button when `debt > 0` — a small,
  intentional UX improvement, not an oversight.
- The customer list's order count/total-spent (in `page.tsx`) excludes
  cancelled orders but, unlike the Home revenue card, does **not** exclude
  unpaid ones — it's "how much business this customer represents," not
  revenue. Don't reuse the Home revenue filter (`payment_status !==
  "unpaid"`) here; they're different metrics on purpose.
- `/report` applies the same revenue-counting rule as Home
  (`fulfillment_status != "cancel" && payment_status != "unpaid"`),
  filtered at the query level in `reportService.getReport()` — see the
  "Thu Chi" section above for what `/report` actually shows now (four
  numbers, no chart/top-products/donut — those were removed).
- Bottom-sheet overlays (`src/components/sheet.tsx`, `<Sheet>`) use
  `position: fixed` + a `max-w-[480px]` inner panel, not `absolute` inside
  the shell — the shell's content area is `overflow-y-auto`, which clips
  `absolute` descendants to itself (hiding the header/bottom nav instead of
  covering them). Reuse `<Sheet>` for any new picker/confirm sheet rather
  than reimplementing the overlay.
- A `<Sheet>` rendered inside a `<Link>` (e.g. the cancel/deliver confirm
  sheets in `<OrderStatusActions>`, nested inside each `/orders` row's
  `<Link>`) needs `e.preventDefault()` on top of the panel's existing
  `e.stopPropagation()`, or clicking a button inside it falls through to a
  full-page navigation to the row's href. Why both are required: Next's
  `<Link>` only skips its own navigation when its own click handler sees
  `event.defaultPrevented`; `stopPropagation()` alone stops the click from
  ever reaching that handler, so `<Link>`'s own `preventDefault()` never
  runs and the browser falls back to the native `<a href>` action — worse
  than the soft-nav bug it was meant to prevent. Any ancestor wrapper (see
  `order-status-actions.tsx`) needs the same `preventDefault()`-not-
  `stopPropagation()` treatment for the same reason.
- Every `<input>`/`<textarea>`/`<select>` must render at `>= 16px` font-size
  (Tailwind `text-base` or larger) — iOS Safari auto-zooms the whole page on
  focus for any smaller computed font-size, forcing the user to manually
  pinch-zoom back out. `globals.css` has an unlayered
  `input, textarea, select { font-size: 16px; }` safety net (deliberately
  outside `@layer` so it beats any Tailwind text-size utility), but don't
  rely on it alone for new inputs — set `text-base` explicitly too.
- RLS is enabled on every table but every policy is `using (true) with check
  (true)` for `anon`/`authenticated` (migration `0002`) — i.e. wide open,
  because there's no per-user auth (see "no auth/login" above). This is a
  deliberate simplification, not an oversight: if login/multi-tenant is ever
  added, replace these policies with `auth.uid()`/`shop_id`-scoped ones
  rather than just disabling RLS. Postgres views run with the *view owner's*
  privileges by default and can silently bypass RLS entirely — `customer_debts`
  has `security_invoker = true` set specifically to avoid that trap; keep
  that in mind for any future view.
- Currency is always formatted via `formatVnd()` in `src/lib/format.ts`
  (`n.toLocaleString('vi-VN') + 'Đ'`) — use it everywhere money is displayed.
- Every client-side name/phone search filter runs both the query and the
  candidate field through `normalizeSearchText()` (`src/lib/search.ts`) so
  matching is case- and Vietnamese-diacritic-insensitive (`"tra dao"` matches
  `"Trà Đào Vàng"`). `đ`/`Đ` don't decompose via Unicode NFD like the rest of
  the Vietnamese alphabet, so the helper strips them with an explicit
  replace after the NFD combining-mark strip. Used by `/sale`'s header
  search, `/customers` and `/debt`'s header search, and the local search
  boxes in `<ProductPicker>`/`<CustomerPicker>` — apply it to any new
  name-filtering search box rather than a bare `.toLowerCase().includes()`.
- "Today" for the revenue card / any future date-scoped report must be
  computed in shop-local time (`Asia/Ho_Chi_Minh`, fixed UTC+7), not UTC or
  server time — use `vnTodayStartIso()` / `formatOrderTime()` in
  `src/lib/date.ts` rather than raw `Date`/`toLocaleString` calls.
- The app shell (`SiteHeader` + `BottomNav`, in `src/components/`) is
  mounted once in the root `layout.tsx` and wraps every route — individual
  pages only render their scrollable content, they don't re-implement the
  header/nav. `BottomNav` is a Client Component (needs `usePathname()` for
  the active-tab highlight); `SiteHeader`'s search input is currently
  decorative — wire it up when building the first screen that actually
  filters by it (Sale/Products/Customers).
- Color palette + typography from the design are wired as Tailwind v4
  `@theme` tokens in `src/app/globals.css` (`--color-primary`, `--color-line`,
  `--color-pending`/`-bg`, etc.), not ad hoc hex values — prefer the
  generated utilities (`bg-primary`, `text-muted`, …) over arbitrary
  `bg-[#hex]` so the palette stays centralized. A few one-off status-tint
  colors from the design (e.g. the quick-action tile backgrounds) aren't in
  the theme yet and use arbitrary values; promote them to tokens if they
  turn out to be reused elsewhere.

## PayOS integration

Every order gets a payOS QR payment code at creation, shown on the order
detail page while `payment_status = "unpaid"`; a webhook flips it to paid
automatically once the transfer arrives. Uses the official `@payos/node`
SDK (`src/lib/payos.ts`) rather than hand-rolled HMAC signing — payOS's
signature scheme (sort fields alphabetically, `key=value&...`, HMAC-SHA256
with the checksum key) is easy to get subtly wrong, and a wrong
implementation here is a payment-integrity bug, not a cosmetic one.

- **Credentials**: `PAYOS_CLIENT_ID` / `PAYOS_API_KEY` / `PAYOS_CHECKSUM_KEY`
  (server-only) and `NEXT_PUBLIC_SITE_URL` (the app's own public URL, used
  for `returnUrl`/`cancelUrl` on payment links and as the default webhook
  target) — see `.env.local.example`. Must also be set in Vercel's project
  env vars, not just `.env.local`, since the webhook and any production
  order creation run there.
- **Schema** (migration `0007`): `orders.payos_order_code` (a `bigint`
  defaulting from `payos_order_code_seq`, unique per order) is what payOS's
  `orderCode` actually is — payOS requires a unique *numeric* code per
  payment link, and `orders.id` is a UUID, so it can't double as one.
  `payos_qr_code` (the VietQR/EMVCo payload string — payOS never returns an
  image, every integration renders this client-side, here via `<QrCode>` in
  `src/components/qr-code.tsx` using the `qrcode` package's
  `toCanvas()`), `payos_checkout_url`, and `payos_payment_link_id` are
  filled in after a successful `paymentRequests.create()` call.
- **`payosService.createPaymentLink()`** (`src/lib/services/payosService.ts`)
  is deliberately best-effort: it catches and logs its own errors and
  returns `null` instead of throwing, because creating the *order* must
  never fail just because payOS is down/misconfigured — `ordersService.create()`
  calls it after the order + order_items are already committed, and only
  writes the QR/checkout-url/payment-link-id columns if it succeeds. A
  `null` here just means the order detail page has no QR section to show,
  not an error state.
- **Webhook receiver**: `POST /api/webhooks/payos`
  (`src/app/api/webhooks/payos/route.ts`) parses the body, calls
  `payosService.verifyWebhook()` (throws payOS's own `InvalidSignatureError`
  on a bad signature — never trust webhook data before this check passes),
  and on `code === "00"` calls `ordersService.markPaidViaWebhook(orderCode, amount)`.
  That method is intentionally idempotent (no-ops if the order is already
  `payment_status = "paid"`) and amount-checked (no-ops, with a logged
  error, if the webhook's amount doesn't match `orders.total`) since payOS
  retries webhook delivery until it gets a 2xx — a repeat delivery for an
  already-paid order is an expected, routine case, not a bug. It only
  touches `payment_status`/`payment_method` (→ `"paid"`/`"qr"`), never
  `fulfillment_status` — a customer can pay the QR before the shop has
  fulfilled the order, so payment and fulfillment are independent here,
  unlike `deliver()` where they change together. `markPaidViaWebhook()`
  returns `null` for every no-op case (already paid, amount mismatch,
  unknown order) and `{ id, total, customerName }` only when it actually
  just flipped the order to paid — the webhook route uses that to fire a
  "Thanh toán thành công" notification (both `notificationsService.create()`
  for the header-bell feed and `pushService.sendToAll()` for OS-level push,
  both best-effort/independent of each other and of the webhook's own
  success) exactly once per real payment, not once per payOS retry.
  `NotificationDTO.url` (here `/orders/{id}`) is what `<NotificationBell>`
  (`src/components/notification-bell.tsx`) renders each item as — a `<Link>`
  when `url` is set, a plain `<div>` otherwise; tapping one closes the sheet
  and navigates there. The OS-level push side of the same click already
  worked before this (`public/sw.js`'s `notificationclick` handler opens/
  focuses `payload.url`); the bell's in-app list was the only part not
  wired up yet.
- **Webhook registration** is a one-time setup step, not something the app
  does automatically per-request: run
  `node --env-file=.env.local scripts/register-payos-webhook.mjs` once
  after deploying (payOS itself calls the URL to validate it responds
  correctly before registering it, so the target must already be live).
  Re-run it if the deployed domain ever changes.
- **Editing an order regenerates its QR when the total changes**:
  `ordersService.update()` compares the recomputed `totals.total` against
  the order's previous `total`, and only if they differ (and the order is
  still `payment_status = "unpaid"`) does it cancel the old payOS payment
  link (`payosService.cancelPaymentLink()`, best-effort) and mint a
  replacement with a brand-new `orderCode`. payOS payment links can't be
  edited in place — there's no "update amount" endpoint, only
  create/get/cancel — and reusing a cancelled link's orderCode isn't
  documented as safe, so a fresh numeric code is always minted via the
  `next_payos_order_code()` Postgres function (migration `0008`; a plain
  `nextval()` wrapped in SQL so it's callable through `supabase.rpc()`,
  since it isn't a table row the normal `insert`'s column default can
  supply outside of an `INSERT`). This whole regeneration step is
  best-effort like `create()`'s original QR — a payOS failure here logs and
  moves on rather than blocking the edit.
- **Sharing a receipt**: the share icon on `/orders/[id]` renders
  `<ReceiptTemplate order>` (`src/components/receipt-template.tsx` — a
  plain black-on-white printable-looking layout, deliberately not styled
  like the rest of the app) off-screen (`position: fixed; left: -9999px`,
  never shown directly), snapshots it to a PNG via `html2canvas-pro`
  (dynamically imported inside the click handler so it never lands in the
  main bundle), and hands that to `navigator.share({ files })` so the OS
  share sheet offers Zalo/Messenger/etc. — falls back to opening the image
  in a new tab when `navigator.canShare({ files })` is false (desktop
  browsers mostly). **Uses the `-pro` fork, not plain `html2canvas`**: the
  latter can't parse the `oklch()`/`lab()` color functions Tailwind v4's
  default palette (`bg-white`, `text-neutral-500`, etc.) resolves to via
  `getComputedStyle()`, and throws mid-snapshot on every capture — the
  fork adds that support with an otherwise identical API. The receipt
  reuses `<QrCode>` itself (shown whenever `payos_qr_code` exists and
  `payment_status !== "paid"`, same condition as the page's own QR
  section) — html2canvas captures a live `<canvas>` element's pixels
  directly, so no special-casing was needed there. There's no stored shop
  address to print in the header (unlike the reference receipt image this
  was modeled on), so it only prints "Tara Shop" — revisit if a
  configurable shop address/name ever gets added.

## Thu Chi (income/expense ledger)

`/expenses` — reachable from Home's "Thu Chi" quick action, not in the
bottom nav — is a flat cash ledger independent of the order/revenue side of
the schema: freeform entries of money in ("thu") or out ("chi"), each just
a name + amount + optional note, no category taxonomy. One table
(`expenses`, migration `0009`, soft-delete via `deleted_at` added in
`0010`) holds both directions, distinguished by the `type` column
(`cash_entry_type` enum, migration `0011` — the table started "chi"-only,
so existing/defaulted rows are `'chi'`). `expensesService.list()` takes an
optional `type` filter alongside the existing `time` one;
`expensesService.create()` requires `type`.

- **Home's revenue card stays order-only** — a "thu" entry (manual cash
  received that didn't come through an order, e.g. subletting counter
  space, selling scrap) is not folded into it, still derived purely from
  `orders.total`. **`/report`'s "Doanh thu kỳ này" is the one exception**:
  `reportService.getReport()` computes `revenue = orderRevenue + totalIncome
  - totalExpenses` — the only place in the app where Thu Chi entries affect
  a revenue figure. Don't let that formula leak into Home, and don't
  assume `/report`'s `revenue` and Home's revenue card agree for the same
  period — they're deliberately different metrics now.
- **`/report`'s `totalExpenses`/`totalIncome` stay filtered to `type =
  "chi"`/`type = "thu"` respectively** (`reportService.getReport()`) — this
  is the one place outside `/expenses` itself that reads the `expenses`
  table; check it again if another report/stat ever reads it directly.
- `/report` was deliberately trimmed to four numbers — "Doanh thu kỳ này"
  (the hero card), "Tổng tiền hàng" (`orderRevenue`, the pre-Thu-Chi order
  total), "Tổng thu", "Tổng chi" — dropping the previous avg-order-value,
  items-sold, top-3-products list, and the 7/10-day daily bar chart
  entirely, both from the UI and from `reportService.getReport()`'s query
  (no more `order_items` join or bars/topProducts computation). Don't
  re-add those without being asked; the simplification was deliberate, not
  a placeholder state.
- The add-entry sheet's Thu/Chi toggle and the list/summary cards
  (`Tổng thu` in `text-paid` green, `Tổng chi` in the existing `#3B5BDB`
  blue) are the only UI surface for `type` — filtering the list by
  Tất cả/Thu/Chi reuses the same URL-search-param pattern as `/orders`
  (`useSearchParams()` wrapped in `<Suspense>`, filter chips as plain
  `<Link>`s), not client state.
- `/expenses`' header mirrors `/orders` exactly, not the rest of the app's
  "‹ page title" convention: a sticky bar holding the Tất cả/Thu/Chi tabs
  plus a "Bộ lọc" button (badged with a count when the time filter is
  active) that opens a sheet containing just the time chips + custom-range
  picker — there's no separate back-button/title row above it, same as
  `/orders`. Don't add one back by copying another screen's header pattern.
