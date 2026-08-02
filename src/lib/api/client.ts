/**
 * GraphQL taşıma katmanı — iki yol:
 *
 *  gqlServer  Server Component / Route Handler → TicariCore'a DOĞRUDAN gider
 *             (sunucudan sunucuya; CORS yok). Publishable key env'den okunur.
 *             Next'in fetch önbelleğine `revalidate` ile katılır → katalog
 *             sayfaları ERP'ye her istekte yük bindirmez (ISR).
 *
 *  gqlClient  Tarayıcı → kendi /api/graphql proxy'mize gider; proxy anahtarı
 *             ekleyip backend'e iletir. Böylece backend'in CORS listesine
 *             storefront origin'i eklemek GEREKMEZ ve anahtar istemci
 *             paketine gömülmez.
 *
 * Hata sözleşmesi: backend hataları {"errors":[{"message"}]} zarfında döner
 * (HTTP 200 olsa bile). İki yol da ilk mesajı Error olarak fırlatır.
 */

interface GqlEnvelope<T> {
  data?: T;
  errors?: { message?: string }[];
}

async function coz<T>(res: Response): Promise<T> {
  let body: GqlEnvelope<T> | null = null;
  try {
    body = (await res.json()) as GqlEnvelope<T>;
  } catch {
    /* JSON değil — aşağıda HTTP koduyla raporlanır */
  }
  if (body?.errors?.length) {
    throw new Error(body.errors[0].message || "İstek başarısız oldu.");
  }
  if (!res.ok || !body?.data) {
    throw new Error(`Sunucu hatası (HTTP ${res.status}).`);
  }
  return body.data;
}

/** Sunucu tarafı istek. `revalidate` saniye cinsinden ISR süresi; 0 = önbelleksiz. */
export async function gqlServer<T>(
  query: string,
  variables?: Record<string, unknown>,
  opts?: { revalidate?: number },
): Promise<T> {
  const base = process.env.TICARICORE_URL ?? "http://localhost:6210";
  const key = process.env.TICARICORE_PUBLISHABLE_KEY;
  if (!key) {
    throw new Error(
      "TICARICORE_PUBLISHABLE_KEY tanımsız — .env.local dosyanızı .env.example'dan oluşturun.",
    );
  }
  const revalidate = opts?.revalidate ?? 60;
  const res = await fetch(`${base}/graphql`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-Publishable-Key": key },
    body: JSON.stringify({ query, variables }),
    ...(revalidate > 0 ? { next: { revalidate } } : { cache: "no-store" }),
  });
  return coz<T>(res);
}

/** Tarayıcı tarafı istek — /api/graphql proxy üzerinden. token = storefront JWT. */
export async function gqlClient<T>(
  query: string,
  variables?: Record<string, unknown>,
  token?: string | null,
): Promise<T> {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (token) headers.Authorization = `Bearer ${token}`;
  let res: Response;
  try {
    res = await fetch("/api/graphql", {
      method: "POST",
      headers,
      body: JSON.stringify({ query, variables }),
    });
  } catch {
    throw new Error("Sunucuya bağlanılamadı — internet bağlantınızı kontrol edin.");
  }
  return coz<T>(res);
}
