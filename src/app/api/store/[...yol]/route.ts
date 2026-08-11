/**
 * Vitrin REST proxy'si — tarayıcının tek API kapısı.
 *
 * Tarayıcı → /api/store/... → TicariCore /store/v1/...
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
 * Server Component'lardan (apiSunucu + ISR) çekilir — orada istek GET'tir ve
 * backend'in Cache-Control başlığı işe yarar.
 */

const YONTEMLER = ["GET", "POST", "PUT", "PATCH", "DELETE"] as const;

async function ilet(req: Request, yolParcalari: string[]): Promise<Response> {
  const base = process.env.TICARICORE_URL ?? "http://localhost:6210";
  const key = process.env.TICARICORE_PUBLISHABLE_KEY;
  if (!key) {
    return Response.json(
      { errors: [{ message: "Sunucu yapılandırması eksik: TICARICORE_PUBLISHABLE_KEY" }] },
      { status: 500 },
    );
  }

  const headers: Record<string, string> = { "X-Publishable-Key": key };
  const auth = req.headers.get("authorization");
  if (auth) headers.Authorization = auth;
  const tip = req.headers.get("content-type");
  if (tip) headers["Content-Type"] = tip;

  // Sorgu dizesi AYNEN taşınır (limit/offset/search süzgeçleri).
  const arama = new URL(req.url).search;
  // Yol parçaları encode edilir: ham birleştirme, '..' ya da '/' içeren bir
  // parçayla vitrin önekinin DIŞINA çıkabilirdi.
  const yol = yolParcalari.map(encodeURIComponent).join("/");

  const govdesiz = req.method === "GET" || req.method === "HEAD";
  let upstream: Response;
  try {
    upstream = await fetch(`${base}/store/v1/${yol}${arama}`, {
      method: req.method,
      headers,
      body: govdesiz ? undefined : await req.text(),
      cache: "no-store",
    });
  } catch {
    return Response.json(
      { errors: [{ message: "Mağaza sunucusuna ulaşılamadı — lütfen tekrar deneyin." }] },
      { status: 502 },
    );
  }

  const govde = await upstream.text();
  return new Response(govde || null, {
    status: upstream.status,
    headers: { "Content-Type": "application/json" },
  });
}

type Baglam = { params: Promise<{ yol: string[] }> };

async function isle(req: Request, ctx: Baglam): Promise<Response> {
  const { yol } = await ctx.params;
  return ilet(req, yol ?? []);
}

export const GET = isle;
export const POST = isle;
export const PUT = isle;
export const PATCH = isle;
export const DELETE = isle;

export const dynamic = "force-dynamic";

export type ProxyYontemi = (typeof YONTEMLER)[number];
