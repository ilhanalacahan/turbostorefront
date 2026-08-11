import { apiIstemci } from "./client";
import type { PaymentSession } from "./types";

/**
 * Ödeme akışı — TicariCore'da AYRI bir "checkout" ucu YOKTUR:
 *
 *   1. adresYaz (sepet)   → iletişim + teslimat/fatura bilgisi sepete yazılır
 *   2. odemeBaslat        → tüm ön koşullar BURADA doğrulanır (stok, kur,
 *      kampanya tazeleme, depo çözümü) ve 3D yönlendirme adresi döner
 *   3. odemeOnayla        → provizyon; sağlayıcı autoCapture ise tahsilat da
 *      aynı anda düşer ve SİPARİŞ O ANDA DOĞAR (orderUid dolar)
 *
 * clientUid çağıranın ürettiği idempotency anahtarıdır: ağ hatasında aynı
 * anahtarla tekrar çağırmak İKİNCİ oturum açmaz, mevcut oturumu döndürür.
 *
 * "test" sağlayıcısı gerçek bir POS'a gitmez; senaryo parametresiyle
 * başarılı/red/hata uçları denenebilir (demo bunun üstüne kuruludur).
 *
 * TAHSİL VE İADE BURADA YOKTUR: ikisi de back-office işidir ve iç yüzeyde
 * (ticari.v1.OdemeServisi) yaşar — vitrin kasadan para hareket ettiremez.
 */

const yol = (uid: string, ek = "") => `/checkout/sessions/${encodeURIComponent(uid)}${ek}`;

export async function odemeBaslat(opts: {
  cartUid: string;
  clientUid: string;
  providerCode?: string;
  returnUrl?: string;
  token?: string | null;
}): Promise<PaymentSession> {
  return apiIstemci<PaymentSession>("/checkout/sessions", {
    metot: "POST",
    govde: {
      cartUid: opts.cartUid,
      providerCode: opts.providerCode ?? "",
      clientUid: opts.clientUid,
      returnUrl: opts.returnUrl ?? "",
    },
    token: opts.token,
  });
}

/** senaryo yalnız test sağlayıcısında anlamlı: "" başarılı · "red" reddedildi · "hata" iletişim hatası. */
export async function odemeOnayla(
  uid: string,
  senaryo = "",
  token?: string | null,
): Promise<PaymentSession> {
  return apiIstemci<PaymentSession>(yol(uid, "/authorize"), {
    metot: "POST",
    govde: { senaryo },
    token,
  });
}

/** Ödemeyi iptal eder — sepet donmuşsa (değişiklik reddediliyorsa) çözüm budur. */
export async function odemeIptal(uid: string, token?: string | null): Promise<PaymentSession> {
  return apiIstemci<PaymentSession>(yol(uid, "/cancel"), {
    metot: "POST",
    govde: { senaryo: "" },
    token,
  });
}

export async function odemeOturumu(
  uid: string,
  token?: string | null,
): Promise<PaymentSession | null> {
  try {
    return await apiIstemci<PaymentSession>(yol(uid), { token });
  } catch {
    return null;
  }
}
