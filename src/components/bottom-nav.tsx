"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ShopIcon, ReceiptIcon, LedgerIcon, ReportIcon } from "@/components/icons";

const NAV_ITEMS = [
  { href: "/", label: "Trang chủ", Icon: ShopIcon },
  { href: "/orders", label: "Đơn hàng", Icon: ReceiptIcon },
] as const;

const NAV_ITEMS_RIGHT = [
  { href: "/debt", label: "Sổ nợ", Icon: LedgerIcon },
  { href: "/report", label: "Báo cáo", Icon: ReportIcon },
] as const;

export function BottomNav() {
  const pathname = usePathname();

  const item = (href: string, label: string, ItemIcon: typeof ShopIcon) => {
    const active = href === "/" ? pathname === "/" : pathname.startsWith(href);
    return (
      <Link
        key={href}
        href={href}
        className={`flex flex-col items-center gap-0.5 ${
          active ? "text-primary-dark" : "text-nav-inactive"
        }`}
      >
        <ItemIcon width={23} height={23} />
        <span className="text-[10px] font-semibold">{label}</span>
      </Link>
    );
  };

  return (
    <div className="flex flex-none items-center justify-around border-t border-line bg-white px-1 pb-3.5 pt-2">
      {NAV_ITEMS.map(({ href, label, Icon }) => item(href, label, Icon))}

      <Link href="/sale" className="relative z-20 -mt-[22px] flex flex-col items-center gap-0.5">
        <span className="flex size-[52px] items-center justify-center rounded-full border-2 border-primary bg-white text-[26px] font-extrabold text-primary-dark shadow-lg">
          +
        </span>
        <span className="text-[10px] font-semibold text-primary-dark">Bán hàng</span>
      </Link>

      {NAV_ITEMS_RIGHT.map(({ href, label, Icon }) => item(href, label, Icon))}
    </div>
  );
}
