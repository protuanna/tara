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
collect-debt), and **Report** (`/report`, period tabs, revenue bar chart,
stat tiles, top products, payment-method donut). There's no test suite —
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
- A newly-saved order gets `fulfillment_status: "processing"` directly, not
  the `"pending"` column default — that's what the design prototype's
  `saveOrder()` does, so `ordersService.create()` sets it explicitly. Don't
  rely on the DB default for this column.
- The cart (`src/lib/cart-context.tsx`, `CartProvider`) is **in-memory React
  state only**, mounted once in the root layout so it survives client-side
  navigation between `/sale` and `/checkout` — but a hard refresh loses it.
  If that becomes a real problem, persist it (localStorage or a
  `draft_orders` table) rather than reaching for a state library; don't
  duplicate cart logic per-screen.
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
- Order lifecycle mutations (`ordersService.cancel()` /
  `ordersService.deliver()`, exposed as `POST /api/orders/[id]/cancel` and
  `POST /api/orders/[id]/deliver`) and their confirm sheets are one shared
  component, `<OrderStatusActions orderId onChanged variant="row"|"page">`
  (`src/components/order-status-actions.tsx`), used on both the `/orders`
  list rows and the `/orders/[id]` detail page — don't reimplement
  cancel/deliver UI a third time, extend that component. `deliver()` looks
  the order's `customer_id` up server-side itself (not trusted from the
  client) to decide paid vs. debt vs. unpaid; it doesn't touch
  `customer_debts` directly (that view derives from `payment_status`, see
  below). `onChanged` is the caller's `refetch` — always pass one, and see
  the loading-gate gotcha above for why the receiving page must not gate its
  skeleton on raw `loading`.
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
- `/report`'s daily bar chart and its period-scoped numbers (revenue, order
  count, top products, payment donut) are **two independent windows**, both
  computed in `reportService.getReport()`: the bars always cover the last 7
  VN-calendar-days (10 for the `30d` period), regardless of which period tab
  is active, while everything else uses the selected period's cutoff
  (`today`/`7d`/`30d`). This matches the design, not a bug — don't try to
  make the bars "agree" with the period tab. Both windows apply the same
  revenue-counting rule as Home (`fulfillment_status != "cancel" &&
  payment_status != "unpaid"`), filtered at the query level. `vnDateKey()`
  (`src/lib/date.ts`) is what buckets rows into VN calendar days for the
  bars — reuse it for any other daily-grouping report. The donut's
  SVG stroke-dasharray/offset math is recomputed client-side in
  `report/page.tsx` from the plain `{ method, pct }` data the API returns —
  the API itself doesn't know about SVG geometry.
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
