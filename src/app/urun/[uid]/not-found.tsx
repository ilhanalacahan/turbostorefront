import { PackageX } from "lucide-react";
import Link from "next/link";

export default function UrunBulunamadi() {
  return (
    <div className="flex flex-col items-center gap-3 py-24 text-center">
      <PackageX className="size-12 text-soft/50" />
      <h1 className="text-xl font-bold">Ürün bulunamadı</h1>
      <p className="max-w-sm text-sm text-soft">
        Aradığınız ürün yayından kalkmış ya da bu mağazanın vitrininde olmayabilir.
      </p>
      <Link
        href="/urunler"
        className="mt-2 rounded-xl bg-accent px-5 py-2.5 text-sm font-semibold text-accent-foreground hover:bg-accent-hover"
      >
        Tüm Ürünlere Dön
      </Link>
    </div>
  );
}
