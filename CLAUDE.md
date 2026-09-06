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
`/orders/[id]`), **Orders** (`/orders`, list + status/time/payment filters +
cancel/mark-delivered), **Products** (`/products`, add category, add/delete
product — no image upload yet, see below), **Debt** (`/debt`, "Sổ nợ" —
total receivable + per-customer collect action), **Customers**
(`/customers`, list + add + per-customer detail with order stats and
collect-debt), and **Report** (`/report`, period tabs, revenue bar chart,
stat tiles, top products, payment-method donut). There's no test suite —
every screen above was verified by hand against a live Supabase project
(seed data in, hit the route, check the rendered numbers, clean up), not
just "it builds." Do the same when changing business logic: a type-check
passing doesn't mean the query/filter/calculation is actually correct.

Follow the existing patterns for any further work (new field, new screen
variant, etc.): Server Component fetch via `src/lib/supabase/server.ts`,
`"use server"` actions for writes, filters as URL search params rather than
client-only state, shared logic pulled into `src/lib/` instead of
duplicated per screen.

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
  `src/app/debt/actions.ts`'s `collectDebt()` — not decrementing a counter.
- A walk-in customer ("Khách lẻ") is a real row in `customers`
  (`WALKIN_CUSTOMER_ID` in `types.ts`), not a null `customer_id`, so every
  order always has a customer to join against.
- A newly-saved order gets `fulfillment_status: "processing"` directly, not
  the `"pending"` column default — that's what the design prototype's
  `saveOrder()` does, so `src/app/checkout/actions.ts`'s `createOrder` sets
  it explicitly. Don't rely on the DB default for this column.
- The cart (`src/lib/cart-context.tsx`, `CartProvider`) is **in-memory React
  state only**, mounted once in the root layout so it survives client-side
  navigation between `/sale` and `/checkout` — but a hard refresh loses it.
  If that becomes a real problem, persist it (localStorage or a
  `draft_orders` table) rather than reaching for a state library; don't
  duplicate cart logic per-screen.
- Order creation (`src/app/checkout/actions.ts`) recomputes totals
  server-side via `calcTotals()` from the raw cart/fee/discount — never
  trust a client-submitted total. It's also **not transactional**: it
  inserts the order then its `order_items`, and best-effort deletes the
  order if the items insert fails, rather than using a real DB transaction
  (supabase-js has no multi-statement transaction API). A `create_order`
  Postgres RPC would fix that properly if it ever matters.
- Order lifecycle mutations (`src/app/orders/actions.ts`: `cancelOrder`,
  `deliverOrder`) and their confirm sheets are one shared component,
  `<OrderStatusActions orderId customerId variant="row"|"page">`
  (`src/components/order-status-actions.tsx`), used on both the `/orders`
  list rows and the `/orders/[id]` detail page — don't reimplement
  cancel/deliver UI a third time, extend that component. `deliverOrder`
  decides paid vs. debt vs. unpaid from `customerId === WALKIN_CUSTOMER_ID`;
  it doesn't touch `customer_debts` directly (that view derives from
  `payment_status`, see below). Every mutation calls `router.refresh()`
  afterward to re-pull the Server Component data — there's no client-side
  cache/store of orders to update manually.
- `/orders` reads its filters (`status`/`time`/`pay`) from **URL search
  params**, not client state — `OrdersScreen` is handed the parsed values as
  props and every filter chip/tab is a plain `<Link>` to a new query string
  (see `ordersUrl()` in `orders-screen.tsx`). This keeps filtering
  server-rendered/shareable and avoids a client fetch layer; follow the same
  pattern for `/report`'s period filter rather than introducing client-side
  fetching.
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
- `createCustomer` (`src/app/checkout/actions.ts`) and `collectDebt`
  (`src/app/debt/actions.ts`) are reused as-is by `/customers` — don't
  duplicate "add a customer" or "mark debt collected" logic there. One
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
- `/report`'s daily bar chart and its period-scoped numbers (revenue, order
  count, top products, payment donut) are **two independent windows**, both
  computed in `src/app/report/page.tsx`: the bars always cover the last 7
  VN-calendar-days (10 for the `30d` period), regardless of which period tab
  is active, while everything else uses the selected period's cutoff
  (`today`/`7d`/`30d`). This matches the design, not a bug — don't try to
  make the bars "agree" with the period tab. Both windows apply the same
  revenue-counting rule as Home (`fulfillment_status != "cancel" &&
  payment_status != "unpaid"`), filtered at the query level this time rather
  than in JS. `vnDateKey()` (`src/lib/date.ts`) is what buckets rows into VN
  calendar days for the bars — reuse it for any other daily-grouping report.
- Bottom-sheet overlays (`src/components/sheet.tsx`, `<Sheet>`) use
  `position: fixed` + a `max-w-[480px]` inner panel, not `absolute` inside
  the shell — the shell's content area is `overflow-y-auto`, which clips
  `absolute` descendants to itself (hiding the header/bottom nav instead of
  covering them). Reuse `<Sheet>` for any new picker/confirm sheet rather
  than reimplementing the overlay.
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
