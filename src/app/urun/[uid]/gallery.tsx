"use client";

import { useState } from "react";

import { ProductImage } from "@/components/product-image";

/** Galeri — büyük görsel + küçük seçiciler (tek görselde seçici gizlenir). */
export function Gallery({ images, alt }: { images: string[]; alt: string }) {
  const [aktif, setAktif] = useState(0);
  const secili = images[aktif] ?? "";

  return (
    <div className="space-y-3">
      <div className="relative aspect-square overflow-hidden rounded-3xl border border-line bg-surface">
        <ProductImage src={secili} alt={alt} sizes="(max-width: 1024px) 100vw, 50vw" priority />
      </div>
      {images.length > 1 ? (
        <div className="flex gap-2 overflow-x-auto pb-1">
          {images.map((url, i) => (
            <button
              key={url + i}
              type="button"
              aria-label={`Görsel ${i + 1}`}
              onClick={() => setAktif(i)}
              className={`relative size-16 shrink-0 overflow-hidden rounded-xl border transition ${
                i === aktif ? "border-accent ring-2 ring-accent/30" : "border-line hover:border-soft"
              }`}
            >
              <ProductImage src={url} alt="" sizes="64px" />
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
