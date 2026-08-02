"use client";

import { Home, LayoutGrid, ShoppingBag, User } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { useSepetAdedi } from "@/hooks/use-cart";

/**
 * Mobil alt navigasyon — e-ticaret trafiğinin çoğu mobilden gelir;
 * dört ana hedef başparmak menzilinde durur. md ve üstünde gizlenir.
 */
export function BottomNav() {
  const pathname = usePathname();
  const adet = useSepetAdedi();

  const oge = (href: string, etiket: string, Icon: typeof Home, rozet?: number) => {
    const aktif = href === "/" ? pathname === "/" : pathname.startsWith(href);
    return (
      <Link
        href={href}
        className={`relative flex flex-1 flex-col items-center gap-0.5 py-2 text-[11px] font-medium transition ${
          aktif ? "text-accent" : "text-soft"
        }`}
      >
        <span className="relative">
          <Icon className="size-5" />
          {rozet ? (
            <span className="absolute -right-2 -top-1.5 flex size-4 items-center justify-center rounded-full bg-accent text-[9px] font-bold text-accent-foreground">
              {rozet > 9 ? "9+" : rozet}
            </span>
          ) : null}
        </span>
        {etiket}
      </Link>
    );
  };

  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 flex border-t border-line bg-surface/95 backdrop-blur md:hidden">
      {oge("/", "Ana Sayfa", Home)}
      {oge("/urunler", "Ürünler", LayoutGrid)}
      {oge("/sepet", "Sepet", ShoppingBag, adet)}
      {oge("/hesap", "Hesap", User)}
    </nav>
  );
}
