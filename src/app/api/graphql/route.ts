/**
 * GraphQL proxy — tarayıcının tek API kapısı.
 *
 * Tarayıcı → POST /api/graphql → TicariCore /graphql
 *
 * Neden proxy?
 *  - CORS derdi sıfır: tarayıcı kendi origin'ine istek atar, backend'in
 *    CORS_ORIGINS listesine storefront'u eklemek gerekmez.
 *  - Publishable key istemci paketine gömülmez; burada (sunucuda) eklenir.
 *  - Müşteri girişi yapılmışsa Authorization başlığı AYNEN iletilir —
 *    storefront JWT'nin kanalı ile anahtarın kanalı backend'de çapraz
 *    denetlenir (uyuşmazsa 403).
 *
 * Bilinçli olarak önbelleksiz: buradan geçen her şey (sepet, hesap, ödeme)
 * kişiye özeldir. Katalog gibi önbelleklenebilir veriler bu yoldan DEĞİL,
 * Server Component'lardan (gqlServer + ISR) çekilir.
 */
export async function POST(req: Request): Promise<Response> {
  const base = process.env.TICARICORE_URL ?? "http://localhost:6210";
  const key = process.env.TICARICORE_PUBLISHABLE_KEY;
  if (!key) {
    return Response.json(
      { errors: [{ message: "Sunucu yapılandırması eksik: TICARICORE_PUBLISHABLE_KEY" }] },
      { status: 500 },
    );
  }

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    "X-Publishable-Key": key,
  };
  const auth = req.headers.get("authorization");
  if (auth) headers.Authorization = auth;

  let upstream: Response;
  try {
    upstream = await fetch(`${base}/graphql`, {
      method: "POST",
      headers,
      body: await req.text(),
      cache: "no-store",
    });
  } catch {
    return Response.json(
      { errors: [{ message: "Mağaza sunucusuna ulaşılamadı — lütfen tekrar deneyin." }] },
      { status: 502 },
    );
  }

  return new Response(await upstream.text(), {
    status: upstream.status,
    headers: { "Content-Type": "application/json" },
  });
}
