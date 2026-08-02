import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

import { BottomNav } from "@/components/bottom-nav";
import { CartDrawer } from "@/components/cart-drawer";
import { Footer } from "@/components/footer";
import { Header } from "@/components/header";
import { Providers } from "@/components/providers";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

const SITE_ADI = process.env.NEXT_PUBLIC_SITE_NAME ?? "TurboStore";

export const metadata: Metadata = {
  title: {
    default: `${SITE_ADI} — Teknoloji Mağazası`,
    template: `%s | ${SITE_ADI}`,
  },
  description:
    "TicariCore ERP üzerinde çalışan headless e-ticaret vitrini. Elektronik ürünlerde güncel fiyat ve canlı stok.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="tr" className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col">
        <Providers>
          <Header />
          <main className="mx-auto w-full max-w-7xl flex-1 px-4">{children}</main>
          <Footer />
          <CartDrawer />
          <BottomNav />
        </Providers>
      </body>
    </html>
  );
}
