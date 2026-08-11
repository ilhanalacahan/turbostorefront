/**
 * TicariCore REST taşıma katmanı — iki yol:
 *
 *  apiSunucu   Server Component / Route Handler → TicariCore'a DOĞRUDAN gider
 *              (sunucudan sunucuya; CORS yok). Publishable key env'den okunur.
 *              İstek GET'tir ve Next'in veri önbelleğine `revalidate` ile
 *              katılır — katalog sayfaları ERP'ye her ziyarette inmez.
 *
 *  apiIstemci  Tarayıcı → kendi /api/store proxy'mize gider; proxy anahtarı
 *              ekleyip backend'e iletir. Böylece backend'in CORS listesine
 *              storefront origin'i eklemek GEREKMEZ ve anahtar istemci
 *              paketine gömülmez.
 *
 * NEDEN REST: vitrin okuması önbellek ister, önbellek de GET ister. Eski tel
 * (GraphQL) her şeyi POST'ladığı için ne CDN ne ara katman devreye girebiliyor,
 * ISR yalnız Next'in kendi önbelleğine kalıyordu. Backend artık aynı veriyi
 * `Cache-Control: s-maxage` ile GET olarak veriyor.
 *
 * Hata sözleşmesi DEĞİŞMEDİ: backend hataları {"errors":[{"message"}]}
 * zarfında döner ve makine okunur parça HTTP DURUM KODUDUR (mesaj metnini
 * koklamak yasaktır). İki yol da ilk mesajı Error olarak fırlatır.
 */

const VITRIN_ONEKI = "/store/v1";

interface HataZarfi {
  errors?: { message?: string }[];
}

/** ApiHatasi HTTP durumunu taşır — çağıran 401'i "oturum düştü"ye çevirebilir. */
export class ApiHatasi extends Error {
  readonly status: number;
  constructor(mesaj: string, status: number) {
    super(mesaj);
    this.name = "ApiHatasi";
    this.status = status;
  }
}

async function coz<T>(res: Response): Promise<T> {
  // 204: gövdesiz başarı (silme uçları).
  if (res.status === 204) return undefined as T;
  let body: unknown = null;
  try {
    body = await res.json();
  } catch {
    /* JSON değil — aşağıda HTTP koduyla raporlanır */
  }
  if (!res.ok) {
    const zarf = body as HataZarfi | null;
    const mesaj = zarf?.errors?.[0]?.message || `Sunucu hatası (HTTP ${res.status}).`;
    throw new ApiHatasi(mesaj, res.status);
  }
  return body as T;
}

/** Sunucu tarafı GET. `revalidate` saniye cinsinden ISR süresi; 0 = önbelleksiz. */
export async function apiSunucu<T>(
  yol: string,
  opts?: { revalidate?: number },
): Promise<T> {
  const base = process.env.TICARICORE_URL ?? "http://localhost:6210";
  const key = process.env.TICARICORE_PUBLISHABLE_KEY;
  if (!key) {
    throw new ApiHatasi(
      "TICARICORE_PUBLISHABLE_KEY tanımsız — .env.local dosyanızı .env.example'dan oluşturun.",
      500,
    );
  }
  const revalidate = opts?.revalidate ?? 60;
  const res = await fetch(`${base}${VITRIN_ONEKI}${yol}`, {
    headers: { "X-Publishable-Key": key },
    ...(revalidate > 0 ? { next: { revalidate } } : { cache: "no-store" }),
  });
  return coz<T>(res);
}

/**
 * Tarayıcı tarafı istek — /api/store proxy üzerinden.
 * token = storefront JWT (varsa Authorization başlığına konur).
 */
export async function apiIstemci<T>(
  yol: string,
  opts?: { metot?: string; govde?: unknown; token?: string | null },
): Promise<T> {
  const headers: Record<string, string> = {};
  if (opts?.govde !== undefined) headers["Content-Type"] = "application/json";
  if (opts?.token) headers.Authorization = `Bearer ${opts.token}`;
  let res: Response;
  try {
    res = await fetch(`/api/store${yol}`, {
      method: opts?.metot ?? "GET",
      headers,
      body: opts?.govde !== undefined ? JSON.stringify(opts.govde) : undefined,
    });
  } catch {
    throw new ApiHatasi("Sunucuya bağlanılamadı — internet bağlantınızı kontrol edin.", 0);
  }
  return coz<T>(res);
}

/** Sorgu dizesi kurar; boş/undefined değerler DÜŞER (bayat önbellek anahtarı üretmesin). */
export function sorgu(params: Record<string, string | number | undefined>): string {
  const usp = new URLSearchParams();
  for (const [ad, deger] of Object.entries(params)) {
    if (deger === undefined || deger === "" ) continue;
    usp.set(ad, String(deger));
  }
  const s = usp.toString();
  return s ? `?${s}` : "";
}
