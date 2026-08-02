"use client";

import { ArrowRight, ShoppingBag, Tag, X } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

import { CartLines, CartTotals } from "@/components/cart-lines";
import { useCart, useKupon } from "@/hooks/use-cart";

/**
 * Sepet sayfası — çekmecenin geniş hâli + kupon alanı.
 * Kupon backend'de en avantajlı kampanyayla yarışır: otomatik kampanya daha
 * iyiyse backend kuponu reddedip kampanyanın adını söyler (mesaj toast'a düşer).
 */
export default function SepetSayfasi() {
  const { data: sepet, isPending } = useCart();
  const { uygula, kaldir } = useKupon();
  const [kod, setKod] = useState("");
  const dolu = sepet && sepet.status === 0 && sepet.lines.length > 0;

  return (
    <div className="mx-auto max-w-3xl space-y-5 py-6">
      <h1 className="text-2xl font-bold">Sepetim</h1>

      {isPending && !sepet ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-20 animate-pulse rounded-2xl bg-line/40" />
          ))}
        </div>
      ) : !dolu ? (
        <div className="flex flex-col items-center gap-3 rounded-2xl border border-line bg-surface p-14 text-center">
          <ShoppingBag className="size-10 text-soft/50" />
          <p className="font-medium">Sepetiniz boş</p>
          <p className="text-sm text-soft">Beğendiğiniz ürünleri sepetinize ekleyin.</p>
          <Link
            href="/urunler"
            className="mt-1 rounded-xl bg-accent px-5 py-2.5 text-sm font-semibold text-accent-foreground hover:bg-accent-hover"
          >
            Alışverişe Başla
          </Link>
        </div>
      ) : (
        <>
          <div className="rounded-2xl border border-line bg-surface px-4">
            <CartLines sepet={sepet} />
          </div>

          {/* Kupon */}
          <div className="rounded-2xl border border-line bg-surface p-4">
            {sepet.couponCode ? (
              <div className="flex items-center justify-between text-sm">
                <span className="flex items-center gap-2 font-medium text-success">
                  <Tag className="size-4" /> Kupon uygulandı: {sepet.couponCode}
                </span>
                <button
                  type="button"
                  onClick={() => kaldir.mutate()}
                  disabled={kaldir.isPending}
                  className="flex items-center gap-1 text-soft hover:text-danger"
                >
                  <X className="size-4" /> Kaldır
                </button>
              </div>
            ) : (
              <form
                className="flex gap-2"
                onSubmit={(e) => {
                  e.preventDefault();
                  if (kod.trim()) uygula.mutate(kod.trim());
                }}
              >
                <input
                  value={kod}
                  onChange={(e) => setKod(e.target.value)}
                  placeholder="Kupon kodu"
                  className="h-10 flex-1 rounded-xl border border-line bg-background px-3 text-sm outline-none focus:border-accent"
                />
                <button
                  type="submit"
                  disabled={uygula.isPending || !kod.trim()}
                  className="h-10 rounded-xl border border-line px-4 text-sm font-semibold transition hover:bg-background disabled:opacity-40"
                >
                  Uygula
                </button>
              </form>
            )}
          </div>

          <div className="rounded-2xl border border-line bg-surface p-4">
            <CartTotals sepet={sepet} />
            <Link
              href="/odeme"
              className="mt-4 flex h-12 items-center justify-center gap-2 rounded-xl bg-accent font-semibold text-accent-foreground transition hover:bg-accent-hover"
            >
              Ödemeye Geç <ArrowRight className="size-4" />
            </Link>
          </div>
        </>
      )}
    </div>
  );
}
