import { gqlClient } from "./client";
import type { PaymentSession } from "./types";

/**
 * Ödeme akışı — TicariCore'da AYRI bir "checkout" mutation'ı YOKTUR:
 *
 *   1. cartSetAddress   → iletişim + teslimat/fatura bilgisi sepete yazılır
 *   2. paymentSessionStart → tüm ön koşullar BURADA doğrulanır (stok, kur,
 *      kampanya tazeleme, depo çözümü) ve 3D yönlendirme adresi döner
 *   3. paymentSessionAuthorize → provizyon; sağlayıcı autoCapture ise tahsilat
 *      da aynı anda düşer ve SİPARİŞ O ANDA DOĞAR (orderUid dolar)
 *
 * clientUid çağıranın ürettiği idempotency anahtarıdır: ağ hatasında aynı
 * anahtarla tekrar çağırmak İKİNCİ oturum açmaz, mevcut oturumu döndürür.
 *
 * "test" sağlayıcısı gerçek bir POS'a gitmez; senaryo parametresiyle
 * başarılı/red/hata uçları denenebilir (demo bunun üstüne kuruludur).
 */

const OTURUM_ALANLARI = `uid providerCode channelUid cartUid orderUid status statusLabel
  amount capturedAmount refundedAmount curCode redirectUrl providerRef paymentUid
  errorCode errorMessage createdAt
  transactions { uid kind status amount providerRef errorCode errorMessage createdAt }`;

export async function odemeBaslat(opts: {
  cartUid: string;
  clientUid: string;
  providerCode?: string;
  returnUrl?: string;
  token?: string | null;
}): Promise<PaymentSession> {
  const d = await gqlClient<{ paymentSessionStart: PaymentSession }>(
    `mutation Baslat($cartUid: String, $providerCode: String, $clientUid: String, $returnUrl: String) {
      paymentSessionStart(cartUid: $cartUid, providerCode: $providerCode,
        clientUid: $clientUid, returnUrl: $returnUrl) { ${OTURUM_ALANLARI} }
    }`,
    {
      cartUid: opts.cartUid,
      providerCode: opts.providerCode ?? "",
      clientUid: opts.clientUid,
      returnUrl: opts.returnUrl ?? "",
    },
    opts.token,
  );
  return d.paymentSessionStart;
}

/** senaryo yalnız test sağlayıcısında anlamlı: "" başarılı · "red" reddedildi · "hata" iletişim hatası. */
export async function odemeOnayla(
  uid: string,
  senaryo = "",
  token?: string | null,
): Promise<PaymentSession> {
  const d = await gqlClient<{ paymentSessionAuthorize: PaymentSession }>(
    `mutation Onayla($uid: String!, $senaryo: String) {
      paymentSessionAuthorize(uid: $uid, senaryo: $senaryo) { ${OTURUM_ALANLARI} }
    }`,
    { uid, senaryo },
    token,
  );
  return d.paymentSessionAuthorize;
}

/** Ödemeyi iptal eder — sepet donmuşsa (değişiklik reddediliyorsa) çözüm budur. */
export async function odemeIptal(uid: string, token?: string | null): Promise<PaymentSession> {
  const d = await gqlClient<{ paymentSessionVoid: PaymentSession }>(
    `mutation Iptal($uid: String!) { paymentSessionVoid(uid: $uid) { ${OTURUM_ALANLARI} } }`,
    { uid },
    token,
  );
  return d.paymentSessionVoid;
}

export async function odemeOturumu(uid: string, token?: string | null): Promise<PaymentSession | null> {
  const d = await gqlClient<{ paymentSession: PaymentSession | null }>(
    `query Oturum($uid: String!) { paymentSession(uid: $uid) { ${OTURUM_ALANLARI} } }`,
    { uid },
    token,
  );
  return d.paymentSession;
}
