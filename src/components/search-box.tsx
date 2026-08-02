"use client";

import { Search } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";

/**
 * Arama kutusu — 300 ms DEBOUNCE ile /urunler?ara=... adresini günceller.
 *
 * Neden URL? Sonuç linki paylaşılabilir olur, geri tuşu çalışır ve sunucu
 * bileşeni aynı parametreyle SSR yapar (SEO). Her tuşta API'ye istek
 * ATILMAZ: yazma durunca tek istek gider (ERP'ye yük ilkesi).
 */
export function SearchBox({ autoFocus = false }: { autoFocus?: boolean }) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [deger, setDeger] = useState(params.get("ara") ?? "");
  const zamanlayici = useRef<ReturnType<typeof setTimeout> | null>(null);
  const ilkRender = useRef(true);

  // URL dışarıdan değişirse (geri tuşu) kutu senkron kalsın.
  useEffect(() => {
    setDeger(params.get("ara") ?? "");
  }, [params]);

  useEffect(() => {
    if (ilkRender.current) {
      ilkRender.current = false;
      return;
    }
    if (zamanlayici.current) clearTimeout(zamanlayici.current);
    zamanlayici.current = setTimeout(() => {
      const q = deger.trim();
      const mevcut = params.get("ara") ?? "";
      if (q === mevcut) return;
      router.replace(q ? `/urunler?ara=${encodeURIComponent(q)}` : "/urunler", {
        scroll: pathname !== "/urunler",
      });
    }, 300);
    return () => {
      if (zamanlayici.current) clearTimeout(zamanlayici.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [deger]);

  return (
    <div className="relative w-full">
      <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-soft" />
      <input
        type="search"
        value={deger}
        autoFocus={autoFocus}
        onChange={(e) => setDeger(e.target.value)}
        placeholder="Ürün, marka veya model ara…"
        className="h-10 w-full rounded-xl border border-line bg-background pl-9 pr-3 text-sm outline-none transition focus:border-accent focus:ring-2 focus:ring-accent/20"
      />
    </div>
  );
}
