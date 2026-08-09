import { Shapes } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { koleksiyonlariGetir } from "@/lib/api/catalog";

/**
 * Koleksiyon dizini — kanalın vitrininde ürünü olan pazarlama koleksiyonları.
 * Boş koleksiyonlar backend'de elenir; her kart /koleksiyon/[handle] sayfasına
 * gider. Handle'sız koleksiyon URL üretemez, dizinde gösterilmez.
 */

export const metadata: Metadata = { title: "Koleksiyonlar" };

export default async function Koleksiyonlar() {
  let koleksiyonlar: Awaited<ReturnType<typeof koleksiyonlariGetir>> = [];
  let hata = "";
  try {
    koleksiyonlar = (await koleksiyonlariGetir()).filter((k) => k.handle);
  } catch (e) {
    hata = e instanceof Error ? e.message : "Koleksiyonlar yüklenemedi.";
  }

  return (
    <div className="space-y-5 py-6">
      <h1 className="text-2xl font-bold">Koleksiyonlar</h1>

      {hata ? (
        <div className="rounded-2xl border border-line bg-surface p-10 text-center text-sm text-soft">
          {hata}
        </div>
      ) : koleksiyonlar.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-2xl border border-line bg-surface p-12 text-center">
          <Shapes className="size-10 text-soft/50" />
          <p className="font-medium">Henüz koleksiyon yok</p>
          <p className="text-sm text-soft">Yayında ürünü olan bir koleksiyon bulunmuyor.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {koleksiyonlar.map((k) => (
            <Link
              key={k.uid}
              href={`/koleksiyon/${k.handle}`}
              className="group overflow-hidden rounded-2xl border border-line bg-surface transition hover:border-accent"
            >
              {k.imageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element -- harici görsel; boyut bilinmiyor
                <img
                  src={k.imageUrl}
                  alt={k.name}
                  className="aspect-[3/1] w-full object-cover transition group-hover:scale-[1.02]"
                />
              ) : (
                <div className="flex aspect-[3/1] w-full items-center justify-center bg-background">
                  <Shapes className="size-8 text-soft/40" />
                </div>
              )}
              <div className="space-y-1 p-4">
                <p className="font-semibold">{k.name}</p>
                <p className="text-sm text-soft">
                  {k.productCount} ürün
                  {k.description ? <> · {k.description}</> : null}
                </p>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
