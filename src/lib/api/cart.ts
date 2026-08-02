import { gqlClient } from "./client";
import type { Cart, CartAddressInput } from "./types";

/**
 * Sepet işlemleri — hepsi tarayıcıdan, proxy üzerinden.
 *
 * SEPET KİMLİĞİ: backend'de ayrı bir "cart token" yoktur; sepetin uid'i
 * yetki anahtarıdır (bilen okur/yazar). Misafir sepetinin uid'i tarayıcıda
 * saklanır (store/cart-store.ts) ve her çağrıya ARGÜMAN olarak gider.
 * Müşteri giriş yapınca cartMerge misafir sepetini hesaba taşır.
 *
 * SEPET DONMASI: ödeme başlatıldıysa (paymentSessionStart) sepet mutasyonları
 * backend'ce reddedilir; önce ödemeyi iptal etmek (paymentSessionVoid) gerekir.
 */

const SEPET_ALANLARI = `uid channelUid status curCode email customerName phone owned
  subTotal discountTotal promotionName couponCode taxTotal shippingFee grandTotal
  shipName shipAddress shipCity billName billAddress billCity
  lines { productUid code name quantity unitPrice vatRate grossUnitPrice
    compareAtPrice discountAmount lineSubTotal lineTaxTotal lineTotal }`;

export async function sepetGetir(uid: string, token?: string | null): Promise<Cart | null> {
  const d = await gqlClient<{ cart: Cart | null }>(
    `query Sepet($uid: String!) { cart(uid: $uid) { ${SEPET_ALANLARI} } }`,
    { uid },
    token,
  );
  return d.cart;
}

/** Giriş yapmış müşterinin açık sepeti (yoksa null) — sekmeler arası devir için. */
export async function mevcutSepet(token: string): Promise<Cart | null> {
  const d = await gqlClient<{ cartCurrent: Cart | null }>(
    `query { cartCurrent { ${SEPET_ALANLARI} } }`,
    undefined,
    token,
  );
  return d.cartCurrent;
}

/** Satır ekler; cartUid '' ise YENİ sepet açar (dönen sepetin uid'ini saklayın). */
export async function sepeteEkle(
  cartUid: string,
  productUid: string,
  quantity: string,
  token?: string | null,
): Promise<Cart> {
  const d = await gqlClient<{ cartLineAdd: Cart }>(
    `mutation Ekle($cartUid: String, $productUid: String!, $quantity: String) {
      cartLineAdd(cartUid: $cartUid, productUid: $productUid, quantity: $quantity) { ${SEPET_ALANLARI} }
    }`,
    { cartUid, productUid, quantity },
    token,
  );
  return d.cartLineAdd;
}

/** Satır miktarını MUTLAK değere çeker; "0" satırı siler. */
export async function satirAyarla(
  cartUid: string,
  productUid: string,
  quantity: string,
  token?: string | null,
): Promise<Cart> {
  const d = await gqlClient<{ cartLineSet: Cart }>(
    `mutation Ayarla($cartUid: String!, $productUid: String!, $quantity: String!) {
      cartLineSet(cartUid: $cartUid, productUid: $productUid, quantity: $quantity) { ${SEPET_ALANLARI} }
    }`,
    { cartUid, productUid, quantity },
    token,
  );
  return d.cartLineSet;
}

export async function adresYaz(
  cartUid: string,
  input: CartAddressInput,
  token?: string | null,
): Promise<Cart> {
  const d = await gqlClient<{ cartSetAddress: Cart }>(
    `mutation Adres($cartUid: String!, $input: CartAddressInput!) {
      cartSetAddress(cartUid: $cartUid, input: $input) { ${SEPET_ALANLARI} }
    }`,
    { cartUid, input },
    token,
  );
  return d.cartSetAddress;
}

export async function kuponUygula(cartUid: string, code: string, token?: string | null): Promise<Cart> {
  const d = await gqlClient<{ cartApplyCoupon: Cart }>(
    `mutation Kupon($cartUid: String!, $code: String!) {
      cartApplyCoupon(cartUid: $cartUid, code: $code) { ${SEPET_ALANLARI} }
    }`,
    { cartUid, code },
    token,
  );
  return d.cartApplyCoupon;
}

export async function kuponKaldir(cartUid: string, token?: string | null): Promise<Cart> {
  const d = await gqlClient<{ cartRemoveCoupon: Cart }>(
    `mutation KuponSil($cartUid: String!) { cartRemoveCoupon(cartUid: $cartUid) { ${SEPET_ALANLARI} } }`,
    { cartUid },
    token,
  );
  return d.cartRemoveCoupon;
}

/**
 * Girişten sonra misafir sepetini hesaba taşır (token ŞART).
 * Hesabın açık sepeti varsa satırlar birleşir (miktarlar toplanır, fiyatlar
 * yeniden çözülür); yoksa misafir sepeti hesaba bağlanır. Dönen sepetin
 * uid'i saklanmalıdır — birleşmede uid DEĞİŞEBİLİR.
 */
export async function sepetBirlestir(guestCartUid: string, token: string): Promise<Cart> {
  const d = await gqlClient<{ cartMerge: Cart }>(
    `mutation Birlestir($uid: String!) { cartMerge(guestCartUid: $uid) { ${SEPET_ALANLARI} } }`,
    { uid: guestCartUid },
    token,
  );
  return d.cartMerge;
}
