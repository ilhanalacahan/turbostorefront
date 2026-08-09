import { gqlServer, gqlClient } from "./client";
import type { StorefrontProduct } from "./types";

/**
 * Katalog okuma — hem sunucudan (ISR'lı sayfa iskeleti) hem tarayıcıdan
 * (canlı fiyat/stok tazeleme) çağrılır. Alan listesi tektir ki iki yol
 * aynı şekli döndürsün.
 */

const URUN_ALANLARI = `uid code name subtitle description handle imageUrl
  price compareAtPrice curCode vatRate inStock available virtual images`;

const LISTE_SORGUSU = `query Urunler($search: String, $categoryUid: String, $collectionUid: String, $limit: Int, $offset: Int) {
  storefrontProducts(search: $search, categoryUid: $categoryUid, collectionUid: $collectionUid, limit: $limit, offset: $offset) { ${URUN_ALANLARI} }
}`;

const DETAY_SORGUSU = `query Urun($uid: String!) {
  storefrontProduct(uid: $uid) { ${URUN_ALANLARI} }
}`;

export interface UrunListeParams {
  search?: string;
  /** Kategori filtresi — storefrontCategories'ten gelen uid. */
  categoryUid?: string;
  /** Koleksiyon filtresi — doluyken liste koleksiyonun kürasyon sırasıyla döner. */
  collectionUid?: string;
  /** Backend sayfa başına en fazla 60 verir; fazlası sessizce kırpılır. */
  limit?: number;
  offset?: number;
}

/** Sunucu tarafı liste — arama yoksa 60 sn ISR, aramada önbelleksiz (kişiye özel sonuç). */
export async function urunleriGetir(params: UrunListeParams = {}): Promise<StorefrontProduct[]> {
  const d = await gqlServer<{ storefrontProducts: StorefrontProduct[] }>(
    LISTE_SORGUSU,
    {
      search: params.search ?? "",
      categoryUid: params.categoryUid ?? "",
      collectionUid: params.collectionUid ?? "",
      limit: params.limit ?? 24,
      offset: params.offset ?? 0,
    },
    { revalidate: params.search ? 0 : 60 },
  );
  return d.storefrontProducts;
}

export interface StorefrontCategory {
  uid: string;
  name: string;
  handle: string;
  /** Hiyerarşik ad ("Üst > Alt"). */
  fullName: string;
  /** Kanal kapsamındaki aktif ürün sayısı (bilgilendirme amaçlı). */
  productCount: number;
}

/** Kanalın vitrininde ürünü olan kategoriler — filtre çubuğu (5 dk ISR). */
export async function kategorileriGetir(): Promise<StorefrontCategory[]> {
  const d = await gqlServer<{ storefrontCategories: StorefrontCategory[] }>(
    `query { storefrontCategories { uid name handle fullName productCount } }`,
    undefined,
    { revalidate: 300 },
  );
  return d.storefrontCategories;
}

export interface StorefrontCollection {
  uid: string;
  name: string;
  /** Vitrin URL parçası (/koleksiyon/[handle]). */
  handle: string;
  /** '' = yok. */
  description: string;
  /** '' = yok. */
  imageUrl: string;
  /** Kanal kapsamındaki aktif ürün sayısı (bilgilendirme amaçlı). */
  productCount: number;
}

const KOLEKSIYON_ALANLARI = `uid name handle description imageUrl productCount`;

/** Kanalın vitrininde ürünü olan koleksiyonlar (5 dk ISR). */
export async function koleksiyonlariGetir(): Promise<StorefrontCollection[]> {
  const d = await gqlServer<{ storefrontCollections: StorefrontCollection[] }>(
    `query { storefrontCollections { ${KOLEKSIYON_ALANLARI} } }`,
    undefined,
    { revalidate: 300 },
  );
  return d.storefrontCollections;
}

/** Handle ile tek koleksiyon (sayfa başlığı) — bulunamazsa null. */
export async function koleksiyonGetir(handle: string): Promise<StorefrontCollection | null> {
  try {
    const d = await gqlServer<{ storefrontCollection: StorefrontCollection | null }>(
      `query Koleksiyon($handle: String!) { storefrontCollection(handle: $handle) { ${KOLEKSIYON_ALANLARI} } }`,
      { handle },
      { revalidate: 300 },
    );
    return d.storefrontCollection;
  } catch {
    // Backend "koleksiyon bulunamadı"yı hata olarak döner — sayfa 404'e çevirir.
    return null;
  }
}

/** Sunucu tarafı detay — statik iskelet için (canlı fiyat/stok istemciden tazelenir). */
export async function urunGetir(uid: string): Promise<StorefrontProduct | null> {
  const d = await gqlServer<{ storefrontProduct: StorefrontProduct | null }>(
    DETAY_SORGUSU,
    { uid },
    { revalidate: 120 },
  );
  return d.storefrontProduct;
}

/** Tarayıcı tarafı detay — PDP açıkken güncel fiyat/stok (TanStack Query ile). */
export async function urunGetirCanli(uid: string): Promise<StorefrontProduct | null> {
  const d = await gqlClient<{ storefrontProduct: StorefrontProduct | null }>(DETAY_SORGUSU, { uid });
  return d.storefrontProduct;
}
