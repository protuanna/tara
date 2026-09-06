import type { Metadata } from "next";
import { Be_Vietnam_Pro } from "next/font/google";
import { SiteHeader } from "@/components/site-header";
import { BottomNav } from "@/components/bottom-nav";
import { CartProvider } from "@/lib/cart-context";
import "./globals.css";

const beVietnamPro = Be_Vietnam_Pro({
  variable: "--font-be-vietnam-pro",
  subsets: ["latin", "vietnamese"],
  weight: ["400", "500", "600", "700", "800"],
});

export const metadata: Metadata = {
  title: "Tara Shop",
  description: "Sổ bán hàng cho Tara Shop",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="vi">
      <body className={`${beVietnamPro.variable} font-sans antialiased`}>
        <CartProvider>
          <div className="mx-auto flex h-dvh max-w-[480px] flex-col overflow-hidden bg-surface shadow-xl">
            <SiteHeader />
            <div className="flex-1 overflow-y-auto">{children}</div>
            <BottomNav />
          </div>
        </CartProvider>
      </body>
    </html>
  );
}
