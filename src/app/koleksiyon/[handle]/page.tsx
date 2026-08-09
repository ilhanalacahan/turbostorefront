import { ChevronLeft, ChevronRight, PackageSearch } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { ProductCard } from "@/components/product-card";
import { koleksiyonGetir, urunleriGetir } from "@/lib/api/catalog";

/**
 * Koleksiyon sayfası (/koleksiyon/[handle]) — başlık koleksiyondan, ürünler
 * koleksiyonun KÜRASYON sırasıyla gelir (backend match.sort_order'a göre
 * dizer). Sayfalama /urunler ile aynı kalıptır (24+1 hilesi).
 */

const SAYFA_BOYU = 24;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ handle: string }>;
}): Promise<Metadata> {
  const { handle } = await params;
  const koleksiyon = await koleksiyonGetir(handle);
  if (!koleksiyon) return { title: "Koleksiyon" };
  return {
    title: koleksiyon.name,
    description: koleksiyon.description || undefined,
  };
}

export default async function Koleksiyon({
  params,
  searchParams,
}: {
  params: Promise<{ handle: string }>;
  searchParams: Promise<{ sayfa?: string }>;
}) {
  const { handle } = await params;
  const { sayfa: sayfaParam } = await searchParams;
  const sayfa = Math.max(1, Number(sayfaParam) || 1);

  const koleksiyon = await koleksiyonGetir(handle);
  if (!koleksiyon) notFound();

  let urunler: Awaited<ReturnType<typeof urunleriGetir>> = [];
  let hata = "";
  try {
    urunler = await urunleriGetir({
      collectionUid: koleksiyon.uid,
      limit: SAYFA_BOYU + 1, // +1: sonraki sayfa var mı?
      offset: (sayfa - 1) * SAYFA_BOYU,
    });
  } catch (e) {
    hata = e instanceof Error ? e.message : "Ürünler yüklenemedi.";
  }
  const sonrakiVar = urunler.length > SAYFA_BOYU;
  const gorunen = sonrakiVar ? urunler.slice(0, SAYFA_BOYU) : urunler;

  const sayfaLinki = (n: number) =>
    n > 1 ? `/koleksiyon/${koleksiyon.handle}?sayfa=${n}` : `/koleksiyon/${koleksiyon.handle}`;

  return (
    <div className="space-y-5 py-6">
      <div className="space-y-2">
        <nav className="text-sm text-soft" aria-label="İçerik yolu">
          <Link href="/koleksiyonlar" className="hover:text-foreground hover:underline">
            Koleksiyonlar
          </Link>{" "}
          / <span className="text-foreground">{koleksiyon.name}</span>
        </nav>
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h1 className="text-2xl font-bold">{koleksiyon.name}</h1>
          {sayfa > 1 ? <p className="text-sm text-soft">Sayfa {sayfa}</p> : null}
        </div>
        {koleksiyon.description ? (
          <p className="max-w-2xl text-sm text-soft">{koleksiyon.description}</p>
        ) : null}
      </div>

      {koleksiyon.imageUrl ? (
        // eslint-disable-next-line @next/next/no-img-element -- harici görsel; boyut bilinmiyor
        <img
          src={koleksiyon.imageUrl}
          alt={koleksiyon.name}
          className="aspect-[4/1] w-full rounded-2xl border border-line object-cover"
        />
      ) : null}

      {hata ? (
        <div className="rounded-2xl border border-line bg-surface p-10 text-center text-sm text-soft">
          {hata}
        </div>
      ) : gorunen.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-2xl border border-line bg-surface p-12 text-center">
          <PackageSearch className="size-10 text-soft/50" />
          <p className="font-medium">Bu koleksiyonda yayında ürün yok</p>
          <Link href="/urunler" className="text-sm font-medium text-accent hover:underline">
            Tüm ürünleri göster
          </Link>
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
