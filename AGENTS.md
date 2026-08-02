<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# TurboStoreFront — AI ajanları için harita

Bu repo, **TicariCore ERP**'nin storefront GraphQL API'sine bağlanan Türkçe bir
Next.js (App Router) headless e-ticaret vitrinidir. Kod tabanının dili Türkçedir;
yeni kod da Türkçe adlandırma/yorum kullanmalıdır.

## Next.js 16 notları

- `params` ve `searchParams` **Promise**'tir (`await` edilir).
- Klasik önbellek modeli kullanılır (fetch `next: { revalidate }`);
  `cacheComponents` / `"use cache"` BİLİNÇLİ olarak açılmadı — şablon
  sadeliği tercih edildi.

## Değişmez sözleşmeler (bozmayın)

1. Parasal değerler API'de **string**'dir; istemcide aritmetik YAPILMAZ.
   Tüm toplamlar sunucudan gelir (`Cart` alanları), yalnız biçimlenir
   (`src/lib/format.ts`).
2. Fiyatlar **KDV dahil** etiket fiyatıdır.
3. Sepetin kimliği `cart.uid`'dir (localStorage `tsf-sepet`); ayrı token yoktur.
   Girişte `cartMerge` çağrılır ve **dönen uid saklanır** (değişebilir).
4. `checkout` mutation'ı YOKTUR: sipariş `paymentSessionAuthorize` (capture)
   anında doğar. Akış: `cartSetAddress → paymentSessionStart → authorize`.
   `clientUid` idempotency anahtarıdır (`tsf-odeme-{cartUid}`).
5. Ödeme başlatılmış sepet DONAR; değişiklik için önce `paymentSessionVoid`.
6. Tarayıcı hiçbir zaman backend'e doğrudan gitmez — HER istemci isteği
   `/api/graphql` proxy'sinden geçer (publishable key orada eklenir).
   Sunucu bileşenleri ise `gqlServer` ile doğrudan gider (ISR için).

## Dosya haritası

- `src/lib/api/types.ts` — backend şemasının TS kopyası (alan alan yorumlu)
- `src/lib/api/{catalog,cart,account,payment}.ts` — tüm GraphQL operasyonları;
  yeni uç eklerken alan listelerini (SEPET_ALANLARI vb.) tek yerde tutma
  kalıbını koruyun
- `src/hooks/use-cart.ts` — sepetin tek doğruluk kaynağı; mutasyonlar dönen
  sepeti cache'e YAZAR (invalidation değil)
- `src/store/` — Zustand persist: `cart-store` (cartUid), `auth-store` (JWT)
- `src/app/odeme/page.tsx` — checkout akışının tamamı (en kritik dosya)
- `src/app/globals.css` — tema değişkenleri (tek yerden renk yönetimi)

## Backend'i tanımak

API sözleşmesinin kaynağı TicariCore reposudur (`handler/storefront*.go`,
`handler/odeme.go`). Bu vitrinin kullandığı başlık: `X-Publishable-Key`
(tenant'ı da anahtar çözer). Müşteri JWT'si `Authorization: Bearer` ile gider
ve `typ:"storefront"` damgalıdır — back-office token'ı burada geçmez (ve tersi).

## Doğrulama

```bash
npm run build   # tip denetimi + üretim derlemesi (bunu her değişiklikte çalıştırın)
npm run dev     # canlı deneme için TicariCore :6210 çalışıyor olmalı
```
