import Link from "next/link";
import { ShopIcon, SearchIcon, ScanIcon } from "@/components/icons";

/**
 * Global header shown on every screen (matches the design prototype, where
 * it sits outside the per-tab content). The search input isn't wired up
 * yet — it becomes functional once a screen that actually filters by it
 * (Sale / Products / Customers) is built.
 */
export function SiteHeader() {
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
          placeholder="Tìm sản phẩm, đơn, khách..."
          className="min-w-0 flex-1 bg-transparent text-[13.5px] text-ink outline-none placeholder:text-muted"
        />
      </div>
      <Link
        href="/products"
        aria-label="Sản phẩm"
        className="flex size-[38px] flex-none items-center justify-center rounded-full bg-white/20 text-white"
      >
        <ScanIcon width={19} height={19} />
      </Link>
    </div>
  );
}
