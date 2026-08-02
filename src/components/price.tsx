import { fiyat, indirimYuzdesi } from "@/lib/format";

/**
 * Fiyat gösterimi — KDV DAHİL etiket fiyatı (backend böyle gönderir) +
 * varsa üstü çizili karşılaştırma fiyatı.
 */
export function Price({
  price,
  compareAtPrice,
  curCode,
  size = "md",
}: {
  price: string;
  compareAtPrice?: string;
  curCode: number;
  size?: "md" | "lg";
}) {
  const indirimli = compareAtPrice && Number(compareAtPrice) > Number(price);
  return (
    <div className="flex flex-wrap items-baseline gap-x-2">
      <span
        className={
          size === "lg" ? "text-3xl font-bold tracking-tight" : "text-base font-semibold"
        }
      >
        {fiyat(price, curCode)}
      </span>
      {indirimli ? (
        <span className={`text-soft line-through ${size === "lg" ? "text-lg" : "text-sm"}`}>
          {fiyat(compareAtPrice, curCode)}
        </span>
      ) : null}
    </div>
  );
}

/** "%23" indirim rozeti — görselin köşesine. */
export function DiscountBadge({ price, compareAtPrice }: { price: string; compareAtPrice: string }) {
  const yuzde = indirimYuzdesi(price, compareAtPrice);
  if (yuzde == null) return null;
  return (
    <span className="absolute left-2 top-2 z-10 rounded-md bg-danger px-1.5 py-0.5 text-xs font-bold text-white">
      %{yuzde}
    </span>
  );
}
