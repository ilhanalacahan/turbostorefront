import { ChevronLeft, ChevronRight, PackageSearch } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { ProductCard } from "@/components/product-card";
import { kategorileriGetir, urunleriGetir } from "@/lib/api/catalog";

/**
 * Ürün listesi (PLP). Filtre durumu URL'DEDİR (?ara=…&sayfa=…):
 * link paylaşılabilir, geri tuşu çalışır, sunucu aynı parametreyle SSR yapar.
 * Arama kutusu (header'da) 300 ms debounce ile bu adresi günceller.
 *
 * Sayfalama: backend sayfa başına en çok 60 kayıt verir; 24'lük sayfalarla
 * offset kullanılır. "Sonraki" düğmesi için bir fazla kayıt istenir (24+1) —
 * ayrı bir COUNT sorgusuna gerek kalmaz.
 */

const SAYFA_BOYU = 24;

export const metadata: Metadata = { title: "Tüm Ürünler" };

export default async function Urunler({
  searchParams,
}: {
  searchParams: Promise<{ ara?: string; kategori?: string; sayfa?: string }>;
}) {
  const params = await searchParams;
  const ara = (params.ara ?? "").trim();
  const kategori = (params.kategori ?? "").trim();
  const sayfa = Math.max(1, Number(params.sayfa) || 1);

  let urunler: Awaited<ReturnType<typeof urunleriGetir>> = [];
  let kategoriler: Awaited<ReturnType<typeof kategorileriGetir>> = [];
  let hata = "";
  try {
    // Kategoriler 5 dk ISR'lıdır; ürün listesiyle paralel çekilir.
    [urunler, kategoriler] = await Promise.all([
      urunleriGetir({
        search: ara,
        categoryUid: kategori,
        limit: SAYFA_BOYU + 1, // +1: sonraki sayfa var mı?
        offset: (sayfa - 1) * SAYFA_BOYU,
      }),
      kategorileriGetir().catch(() => []),
    ]);
  } catch (e) {
    hata = e instanceof Error ? e.message : "Ürünler yüklenemedi.";
  }
  const sonrakiVar = urunler.length > SAYFA_BOYU;
  const gorunen = sonrakiVar ? urunler.slice(0, SAYFA_BOYU) : urunler;
  const seciliKategori = kategoriler.find((k) => k.uid === kategori);

  const linkYap = (degisiklik: { kategori?: string; sayfa?: number }) => {
    const p = new URLSearchParams();
    if (ara) p.set("ara", ara);
    const kat = degisiklik.kategori ?? kategori;
    if (kat) p.set("kategori", kat);
    if ((degisiklik.sayfa ?? 1) > 1) p.set("sayfa", String(degisiklik.sayfa));
    const qs = p.toString();
    return qs ? `/urunler?${qs}` : "/urunler";
  };
  const sayfaLinki = (n: number) => linkYap({ sayfa: n });

  return (
    <div className="space-y-5 py-6">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h1 className="text-2xl font-bold">
          {ara ? (
            <>
              &ldquo;{ara}&rdquo; için sonuçlar{" "}
              <span className="text-base font-normal text-soft">({gorunen.length})</span>
            </>
          ) : seciliKategori ? (
            seciliKategori.name
          ) : (
            "Tüm Ürünler"
          )}
        </h1>
        {sayfa > 1 ? <p className="text-sm text-soft">Sayfa {sayfa}</p> : null}
      </div>

      {/* Kategori filtre çubuğu — durum URL'de (?kategori=uid), linkler paylaşılabilir. */}
      {kategoriler.length > 0 ? (
        <div className="flex gap-2 overflow-x-auto pb-1">
          <Link
            href={linkYap({ kategori: "" })}
            className={`shrink-0 rounded-full border px-3.5 py-1.5 text-sm font-medium transition ${
              !kategori
                ? "border-accent bg-accent text-accent-foreground"
                : "border-line bg-surface hover:border-soft"
            }`}
          >
            Tümü
          </Link>
          {kategoriler.map((k) => (
            <Link
              key={k.uid}
              href={linkYap({ kategori: k.uid === kategori ? "" : k.uid })}
              title={k.fullName}
              className={`shrink-0 rounded-full border px-3.5 py-1.5 text-sm font-medium transition ${
                k.uid === kategori
                  ? "border-accent bg-accent text-accent-foreground"
                  : "border-line bg-surface hover:border-soft"
              }`}
            >
              {k.name} <span className="opacity-60">({k.productCount})</span>
            </Link>
          ))}
        </div>
      ) : null}

      {hata ? (
        <div className="rounded-2xl border border-line bg-surface p-10 text-center text-sm text-soft">
          {hata}
        </div>
      ) : gorunen.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-2xl border border-line bg-surface p-12 text-center">
          <PackageSearch className="size-10 text-soft/50" />
          <p className="font-medium">Sonuç bulunamadı</p>
          <p className="text-sm text-soft">
            {ara
              ? "Farklı bir arama terimi deneyin ya da tüm ürünlere göz atın."
              : "Bu kanalda henüz yayında ürün yok."}
          </p>
          {ara ? (
            <Link href="/urunler" className="text-sm font-medium text-accent hover:underline">
              Tüm ürünleri göster
            </Link>
          ) : null}
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {gorunen.map((u) => (
              <ProductCard key={u.uid} urun={u} />
            ))}
          </div>

          {(sayfa > 1 || sonrakiVar) && (
            <nav className="flex items-center justify-center gap-2 pt-4" aria-label="Sayfalama">
              {sayfa > 1 ? (
                <Link
                  href={sayfaLinki(sayfa - 1)}
                  className="flex h-10 items-center gap-1 rounded-xl border border-line bg-surface px-4 text-sm font-medium transition hover:border-accent"
                >
                  <ChevronLeft className="size-4" /> Önceki
                </Link>
              ) : null}
              {sonrakiVar ? (
                <Link
                  href={sayfaLinki(sayfa + 1)}
                  className="flex h-10 items-center gap-1 rounded-xl border border-line bg-surface px-4 text-sm font-medium transition hover:border-accent"
                >
                  Sonraki <ChevronRight className="size-4" />
                </Link>
              ) : null}
            </nav>
          )}
        </>
      )}
    </div>
  );
}
