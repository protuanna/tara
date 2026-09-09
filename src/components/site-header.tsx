"use client";

import Link from "next/link";
import { ShopIcon, SearchIcon } from "@/components/icons";
import { NotificationBell } from "@/components/notification-bell";
import { useHeaderSearch } from "@/lib/header-search-context";

/**
 * Global header shown on every screen (matches the design prototype, where
 * it sits outside the per-tab content). The search input is backed by
 * `useHeaderSearch()` (see header-search-context.tsx) — a screen that wants
 * to filter by it (currently just /customers, by name/phone) reads the
 * same context; screens that don't just ignore it. The context itself
 * resets the query on every route change.
 */
export function SiteHeader() {
  const { query, setQuery } = useHeaderSearch();

  return (
    <div className="flex flex-none items-center gap-2.5 bg-gradient-to-br from-primary-light to-primary px-3.5 py-3">
      <Link
        href="/"
        aria-label="Trang chủ"
        className="flex size-[38px] flex-none items-center justify-center rounded-full bg-white text-primary-dark"
      >
        <ShopIcon width={21} height={21} />
      </Link>
      <div className="flex flex-1 items-center gap-2 rounded-[22px] bg-white/95 px-3.5 py-2.5">
        <SearchIcon width={16} height={16} className="text-muted" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Tìm sản phẩm, đơn, khách..."
          className="header-search-input min-w-0 flex-1 bg-transparent text-base text-ink outline-none placeholder:text-muted"
        />
      </div>
      <NotificationBell />
    </div>
  );
}
