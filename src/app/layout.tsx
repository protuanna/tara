import type { Metadata, Viewport } from "next";
import { Be_Vietnam_Pro } from "next/font/google";
import { SiteHeader } from "@/components/site-header";
import { BottomNav } from "@/components/bottom-nav";
import { ResumeToast } from "@/components/resume-toast";
import { CartProvider } from "@/lib/cart-context";
import { HeaderSearchProvider } from "@/lib/header-search-context";
import "./globals.css";

const beVietnamPro = Be_Vietnam_Pro({
  variable: "--font-be-vietnam-pro",
  subsets: ["latin", "vietnamese"],
  weight: ["400", "500", "600", "700", "800"],
});

// Falls back to localhost until NEXT_PUBLIC_SITE_URL is set (e.g. once the
// Vercel domain is known) — without a metadataBase, Next can't resolve the
// opengraph-image into an absolute URL for link previews.
const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: "Tara Shop",
  description: "Sổ bán hàng cho Tara Shop",
};

export const viewport: Viewport = {
  themeColor: "#BD4D41",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="vi">
      <body
        className={`${beVietnamPro.variable} font-sans antialiased`}
        suppressHydrationWarning
      >
        <CartProvider>
          <HeaderSearchProvider>
            <ResumeToast />
            <div className="mx-auto flex h-dvh max-w-[480px] flex-col overflow-hidden bg-surface shadow-xl">
              <SiteHeader />
              <div className="flex-1 overflow-y-auto">{children}</div>
              <BottomNav />
            </div>
          </HeaderSearchProvider>
        </CartProvider>
      </body>
    </html>
  );
}
