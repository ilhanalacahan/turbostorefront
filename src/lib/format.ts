/**
 * Gösterim yardımcıları. Parasal değerler API'den STRING gelir ("1249.90");
 * burada yalnız BİÇİMLENİR — hesap yapılmaz (hesap backend'in işidir,
 * kuruş farkları oradan tek elden yönetilir).
 */

const PARA_BIRIMLERI: Record<number, string> = { 1: "TRY", 2: "USD", 3: "EUR" };

export function fiyat(deger: string, curCode: number): string {
  const sayi = Number(deger);
  if (!Number.isFinite(sayi)) return deger;
  return new Intl.NumberFormat("tr-TR", {
    style: "currency",
    currency: PARA_BIRIMLERI[curCode] ?? "TRY",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(sayi);
}

/** "3.0000" → "3" · "2.5000" → "2,5" (miktar gösterimi). */
export function miktar(deger: string): string {
  const sayi = Number(deger);
  if (!Number.isFinite(sayi)) return deger;
  return new Intl.NumberFormat("tr-TR", { maximumFractionDigits: 3 }).format(sayi);
}

/** İndirim yüzdesi rozeti için: etiket ve üstü çizili fiyattan yüzde (yalnız gösterim). */
export function indirimYuzdesi(price: string, compareAt: string): number | null {
  const p = Number(price);
  const c = Number(compareAt);
  if (!Number.isFinite(p) || !Number.isFinite(c) || c <= p || c <= 0) return null;
  return Math.round(((c - p) / c) * 100);
}

export function tarih(iso: string): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return new Intl.DateTimeFormat("tr-TR", { dateStyle: "medium" }).format(d);
}

/** Sipariş durum etiketleri (StorefrontOrder alanları). */
export const SIPARIS_DURUM: Record<number, string> = {
  0: "Taslak",
  1: "Onaylandı",
  2: "Tamamlandı",
  3: "İptal",
};
export const ODEME_DURUM: Record<number, string> = {
  0: "Ödeme bekliyor",
  1: "Kısmi ödendi",
  2: "Ödendi",
  3: "İade edildi",
};
