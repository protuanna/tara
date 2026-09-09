// Line icons matching docs/design/tara-shop-prototype-notes.md — plain
// inline SVGs (as the original design used), no icon library dependency.

import type { SVGProps } from "react";

function Icon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.9}
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    />
  );
}

export function ShopIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <Icon {...props}>
      <path d="M3 9.5 12 3l9 6.5" />
      <path d="M5 10v10h14V10" />
      <path d="M9.5 20v-5h5v5" />
    </Icon>
  );
}

export function SearchIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <Icon strokeWidth={2} {...props}>
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-3.5-3.5" />
    </Icon>
  );
}

export function BellIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <Icon strokeWidth={2} {...props}>
      <path d="M6 10a6 6 0 1 1 12 0c0 3.2 1 4.8 1.8 5.7.4.4.1 1.3-.5 1.3H4.7c-.6 0-.9-.9-.5-1.3C5 14.8 6 13.2 6 10Z" />
      <path d="M10 20a2 2 0 0 0 4 0" />
    </Icon>
  );
}

export function CartIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <Icon strokeWidth={1.8} {...props}>
      <path d="M4 4h2l2.4 10.5a2 2 0 0 0 2 1.5h7.2a2 2 0 0 0 2-1.5L21 8H7" />
      <circle cx="10" cy="19.5" r="1.3" />
      <circle cx="18" cy="19.5" r="1.3" />
    </Icon>
  );
}

export function ReceiptIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <Icon strokeWidth={1.8} {...props}>
      <rect x="5" y="3.5" width="14" height="17" rx="2.5" />
      <path d="M9 8h6M9 12h6M9 16h3.5" />
    </Icon>
  );
}

export function BoxIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <Icon strokeWidth={1.8} {...props}>
      <path d="M20.5 8.5 12 12.8 3.5 8.5 12 4.2z" />
      <path d="M3.5 8.5v7L12 19.8l8.5-4.3v-7" />
      <path d="M12 12.8v7" />
    </Icon>
  );
}

export function PeopleIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <Icon strokeWidth={1.8} {...props}>
      <circle cx="9.5" cy="8.5" r="3.4" />
      <path d="M3.5 20c0-3.3 2.7-5.5 6-5.5s6 2.2 6 5.5" />
      <path d="M16.5 6.2a3.2 3.2 0 0 1 0 6.1M18 19.6c0-2.1-.7-3.9-2-5" />
    </Icon>
  );
}

export function LedgerIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <Icon {...props}>
      <path d="M5 4.5h11a3 3 0 0 1 3 3v12H8a3 3 0 0 1-3-3z" />
      <path d="M5 4.5v15" />
      <path d="M12 9v6M10.4 10.4h3.2M10.4 13.6h3.2" />
    </Icon>
  );
}

export function ReportIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.9} strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M4 20h16" />
      <rect x="6" y="11" width="3.2" height="6" rx="1" />
      <rect x="11.4" y="7" width="3.2" height="10" rx="1" />
      <rect x="16.8" y="13.5" width="3.2" height="3.5" rx="1" />
    </svg>
  );
}

export function PencilIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <Icon strokeWidth={1.8} {...props}>
      <path d="M14.5 4.5 19.5 9.5 8.5 20.5H3.5v-5z" />
      <path d="M13 6l5 5" />
    </Icon>
  );
}

export function WalletIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <Icon strokeWidth={1.8} {...props}>
      <path d="M3.5 7.5a2 2 0 0 1 2-2h11.5a2 2 0 0 1 2 2v9.5a2 2 0 0 1-2 2H5.5a2 2 0 0 1-2-2z" />
      <path d="M3.5 9.5h14.5" />
      <path d="M15 13.2h2.6" />
    </Icon>
  );
}

export function ShareIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <Icon strokeWidth={1.8} {...props}>
      <circle cx="18" cy="5.5" r="2.5" />
      <circle cx="6" cy="12" r="2.5" />
      <circle cx="18" cy="18.5" r="2.5" />
      <path d="M8.2 10.7 15.8 6.9M8.2 13.3l7.6 3.8" />
    </Icon>
  );
}
