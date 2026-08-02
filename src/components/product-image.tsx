"use client";

import { ImageOff } from "lucide-react";
import Image from "next/image";
import { useState } from "react";

/**
 * Ürün görseli — URL boşsa ya da yüklenemezse zarif bir yer tutucu gösterir.
 * next/image ile boyutlandırma/format optimizasyonu tarayıcıya göre yapılır;
 * ERP'nin deposundan orijinal boyut inmez.
 */
export function ProductImage({
  src,
  alt,
  sizes,
  priority = false,
}: {
  src: string;
  alt: string;
  sizes: string;
  priority?: boolean;
}) {
  const [kirik, setKirik] = useState(false);
  if (!src || kirik) {
    return (
      <div className="flex size-full items-center justify-center bg-gradient-to-br from-line/60 to-line/20">
        <ImageOff className="size-8 text-soft/60" aria-hidden />
      </div>
    );
  }
  return (
    <Image
      src={src}
      alt={alt}
      fill
      sizes={sizes}
      priority={priority}
      className="object-cover"
      onError={() => setKirik(true)}
    />
  );
}
