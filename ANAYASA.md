# TurboStoreFront Anayasası — vitrin

> Bu belge tek başına yeterli değildir. Birden fazla depoyu bağlayan kurallar
> genel anayasadadır: `TicariGo/ANAYASA.md`. Buradaki maddeler yalnız
> TurboStoreFront'a özgüdür ve genel maddeleri tekrarlamaz.

Next.js (App Router) headless e-ticaret vitrini; TicariCore'un vitrin yüzeyine
bağlanır. Para/vergi G5–G6, sipariş atomikliği G18, misafir carisi G19,
kimlik damgası G12.

---

### V1 — Tarayıcı backend'e doğrudan gitmez

Her istemci isteği `/api/graphql` proxy'sinden geçer; publishable key orada
eklenir. Sunucu bileşenleri ISR için `gqlServer` ile doğrudan gider.

*Neden:* publishable key tarayıcıya sızmaz ve tenant çözümü tek yerde kalır.

### V2 — Sepetin kimliği `cart.uid`'dir

Ayrı bir sepet token'ı yoktur. Girişte `cartMerge` çağrılır ve **dönen uid
saklanır** — birleşmede uid değişebilir.

### V3 — `checkout` mutation'ı yoktur

Sipariş, ödeme oturumu **capture** anında doğar:
`cartSetAddress → paymentSessionStart → authorize`.

`clientUid` idempotency anahtarıdır (`tsf-odeme-{cartUid}`).

### V4 — Ödeme başlatılmış sepet donar

Değişiklik için önce `paymentSessionVoid` çağrılır.

*Neden:* para peşin çekilir (G18); donmamış sepet, tahsil edilen tutarla
gönderilen mal arasında sessiz fark üretir.

### V5 — Alan listeleri tek yerde tutulur

`src/lib/api/{catalog,cart,account,payment}.ts` içindeki GraphQL
operasyonlarında alan listeleri (`SEPET_ALANLARI` vb.) tek yerde tanımlanır;
yeni uç eklerken bu kalıp korunur.

`src/hooks/use-cart.ts` sepetin tek doğruluk kaynağıdır; mutasyonlar dönen
sepeti **cache'e yazar** — invalidation ile yeniden çekmez.

### V6 — Hesaplar kanal kapsamlıdır

Aynı e-posta **başka kanalda başka hesaptır**. Vitrin hesabı kanalına bağlıdır;
kanallar arası kimlik taşınmaz.

*Neden:* kanal carisi ve fiyat bağlamı kanala aittir (G19, G10); tek bir kimliğin
iki kanalda dolaşması, hangi kanalın müşterisi olduğu belirsiz bir hesap üretir.

### V7 — Liste sorgusu kırpılır, görseller yalnız detayda gelir

Liste sorgusu sayfa başına en çok **60** kayıt döndürür — sunucu kırpar, istemci
daha fazlasını isteyemez. `images` alanı **yalnız detay** sorgusunda doludur;
listede boş dizi döner.

*Neden:* vitrin listesi kataloğun tamamını çekmeye çalışırsa ilk boyama süresi
görsel yüküyle çöker.

### V8 — Next.js sürüm notları

- `params` ve `searchParams` **Promise**'tir, `await` edilir.
- Klasik önbellek modeli kullanılır (`next: { revalidate }`).
  `cacheComponents` / `"use cache"` **bilinçli olarak** açılmadı — şablon
  sadeliği tercih edildi.
- Bu sürüm eğitim verisinden farklıdır: kod yazmadan önce
  `node_modules/next/dist/docs/` altındaki ilgili kılavuz okunur.
