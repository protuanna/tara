import Link from "next/link";
import type { ReactNode } from "react";

export function QuickAction({
  href,
  label,
  bg,
  fg,
  children,
}: {
  href: string;
  label: string;
  bg: string;
  fg: string;
  children: ReactNode;
}) {
  return (
    <Link href={href} className="flex flex-col items-center gap-1.5">
      <span
        className={`flex size-[46px] items-center justify-center rounded-[15px] ${bg} ${fg}`}
      >
        {children}
      </span>
      <span className="text-center text-[11.5px] font-semibold text-ink">
        {label}
      </span>
    </Link>
  );
}
