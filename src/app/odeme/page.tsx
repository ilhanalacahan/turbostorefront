"use client";

import {
  BadgeCheck,
  CreditCard,
  Loader2,
  Lock,
  MapPin,
  ShieldCheck,
  XCircle,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

import { CartTotals } from "@/components/cart-lines";
import { useAdresYaz, useCart } from "@/hooks/use-cart";
import { odemeBaslat, odemeIptal, odemeOnayla } from "@/lib/api/payment";
import type { PaymentSession } from "@/lib/api/types";
import { fiyat } from "@/lib/format";
import { useAuthStore } from "@/store/auth-store";
import { useCartStore } from "@/store/cart-store";

/**
 * Ödeme (checkout) — TicariCore'un gerçek akışı:
 *
 *   1. ADRES    cartSetAddress ile iletişim + teslimat sepete yazılır
 *   2. ÖDEME    paymentSessionStart: stok/kur/kampanya CANLI doğrulanır
 *               ("sepette var ama stok bitti" burada yakalanır) ve 3D adresi döner
 *   3. 3D SİM   demo "test" sağlayıcısı gerçek POS'a gitmez; panel 3D adımını
 *               canlandırır — Onayla: paymentSessionAuthorize (autoCapture ile
 *               tahsilat düşer ve SİPARİŞ DOĞAR)
 *
 * clientUid idempotency anahtarıdır: sepete bağlı üretilir ve saklanır; ağ
 * kopsa da aynı anahtar ikinci oturum/sipariş açtırmaz.
 * Ödeme başladıktan sonra sepet DONAR — vazgeçen için "ödemeyi iptal et" var.
 */

interface AdresForm {
  email: string;
  customerName: string;
  phone: string;
  shipAddress: string;
  shipDistrict: string;
  shipCity: string;
}

function clientUidAl(cartUid: string): string {
  const anahtar = `tsf-odeme-${cartUid}`;
  let uid = localStorage.getItem(anahtar);
  if (!uid) {
    uid = crypto.randomUUID();
    localStorage.setItem(anahtar, uid);
  }
  return uid;
}

export default function OdemeSayfasi() {
  const router = useRouter();
  const { data: sepet } = useCart();
  const cartUid = useCartStore((s) => s.cartUid);
  const clearCart = useCartStore((s) => s.clearCart);
  const token = useAuthStore((s) => s.token);
  const account = useAuthStore((s) => s.account);
  const adresYaz = useAdresYaz();

  const [adim, setAdim] = useState<"adres" | "odeme" | "sonuc">("adres");
  const [form, setForm] = useState<AdresForm>({
    email: account?.email ?? "",
    customerName: account?.fullName ?? "",
    phone: account?.phone ?? "",
    shipAddress: "",
    shipDistrict: "",
    shipCity: "",
  });
  const [senaryo, setSenaryo] = useState(""); // '' başarılı · 'red' · 'hata'
  const [oturum, setOturum] = useState<PaymentSession | null>(null);
  const [islemde, setIslemde] = useState(false);
  const [tamamlanan, setTamamlanan] = useState<PaymentSession | null>(null);

  const dolu = sepet && sepet.status === 0 && sepet.lines.length > 0;

  const alan = (k: keyof AdresForm, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const adresiKaydet = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await adresYaz.mutateAsync({
        email: form.email,
        customerName: form.customerName,
        phone: form.phone,
        shipName: form.customerName,
        shipAddress: form.shipAddress,
        shipDistrict: form.shipDistrict,
        shipCity: form.shipCity,
        // Demo: fatura = teslimat. Kurumsal fatura alanları API'de hazır
        // (billCompName, billTaxNumber…) — ihtiyaç olursa forma ekleyin.
        billName: form.customerName,
        billAddress: form.shipAddress,
        billDistrict: form.shipDistrict,
        billCity: form.shipCity,
      });
      setAdim("odeme");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Adres kaydedilemedi.");
    }
  };

  const odemeyiBaslat = async () => {
    setIslemde(true);
    try {
      const s = await odemeBaslat({
        cartUid,
        clientUid: clientUidAl(cartUid),
        returnUrl: window.location.origin + "/odeme",
        token: token || null,
      });
      setOturum(s);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Ödeme başlatılamadı.");
    } finally {
      setIslemde(false);
    }
  };

  const odemeyiOnayla = async () => {
    if (!oturum) return;
    setIslemde(true);
    try {
      const s = await odemeOnayla(oturum.uid, senaryo, token || null);
      if (s.status === 3 && s.orderUid) {
        // captured → sipariş doğdu
        localStorage.removeItem(`tsf-odeme-${cartUid}`);
        clearCart();
        setTamamlanan(s);
        setAdim("sonuc");
      } else if (s.status === 2) {
        // authorized ama capture düşmedi: sağlayıcıda autoCapture kapalı —
        // tahsilat (ve sipariş) back-office onayıyla düşecek. Hata değil.
        setOturum(s);
        toast.info(
          "Ödeme yetkilendirildi; tahsilat mağaza onayı bekliyor (sağlayıcıda autoCapture kapalı).",
        );
      } else {
        setOturum(s);
        toast.error(s.errorMessage || s.statusLabel || "Ödeme tamamlanamadı.");
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Ödeme onaylanamadı.");
    } finally {
      setIslemde(false);
    }
  };

  const odemeyiVazgec = async () => {
    if (!oturum) return;
    setIslemde(true);
    try {
      await odemeIptal(oturum.uid, token || null);
      // İptal edilen oturum aynı clientUid ile OLDUĞU GİBİ döner (backend
      // ikinci çekime izin vermez) — yeni deneme için anahtar döndürülür.
      localStorage.removeItem(`tsf-odeme-${cartUid}`);
      setOturum(null);
      toast.info("Ödeme iptal edildi — sepetiniz tekrar düzenlenebilir.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "İptal edilemedi.");
    } finally {
      setIslemde(false);
    }
  };

  // ---- SONUÇ EKRANI ----
  if (adim === "sonuc" && tamamlanan) {
    return (
      <div className="mx-auto flex max-w-lg flex-col items-center gap-4 py-20 text-center">
        <span className="flex size-16 items-center justify-center rounded-full bg-success/10 text-success">
          <BadgeCheck className="size-9" />
        </span>
        <h1 className="text-2xl font-bold">Siparişiniz alındı 🎉</h1>
        <p className="text-sm text-soft">
          Ödemeniz onaylandı, siparişiniz oluşturuldu ve stok sizin için rezerve edildi.
        </p>
        <div className="w-full space-y-1.5 rounded-2xl border border-line bg-surface p-4 text-left text-sm">
          <div className="flex justify-between">
            <span className="text-soft">Tutar</span>
            <span className="font-semibold">{fiyat(tamamlanan.capturedAmount, tamamlanan.curCode)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-soft">Sipariş No</span>
            <span className="font-mono text-xs">{tamamlanan.orderUid}</span>
          </div>
        </div>
        <div className="flex gap-2">
          <Link
            href="/urunler"
            className="rounded-xl border border-line px-5 py-2.5 text-sm font-semibold hover:bg-surface"
          >
            Alışverişe Devam
          </Link>
          <Link
            href="/hesap"
            className="rounded-xl bg-accent px-5 py-2.5 text-sm font-semibold text-accent-foreground hover:bg-accent-hover"
          >
            Siparişlerim
          </Link>
        </div>
        {!token ? (
          <p className="text-xs text-soft">
            İpucu: üye olursanız siparişlerinizi hesabınızdan takip edebilirsiniz.
          </p>
        ) : null}
      </div>
    );
  }

  // ---- SEPET BOŞ ----
  if (!dolu) {
    return (
      <div className="flex flex-col items-center gap-3 py-24 text-center">
        <p className="font-medium">Ödenecek bir sepet yok</p>
        <button
          type="button"
          onClick={() => router.push("/urunler")}
          className="rounded-xl bg-accent px-5 py-2.5 text-sm font-semibold text-accent-foreground hover:bg-accent-hover"
        >
          Alışverişe Başla
        </button>
      </div>
    );
  }

  const girdiSinifi =
    "h-11 w-full rounded-xl border border-line bg-background px-3 text-sm outline-none transition focus:border-accent focus:ring-2 focus:ring-accent/20";

  return (
    <div className="mx-auto max-w-4xl py-6">
      <h1 className="mb-5 text-2xl font-bold">Ödeme</h1>
      <div className="grid gap-6 md:grid-cols-[1fr_320px]">
        <div className="space-y-4">
          {/* ADIM 1: ADRES */}
          <section className="rounded-2xl border border-line bg-surface p-5">
            <h2 className="mb-4 flex items-center gap-2 font-semibold">
              <MapPin className="size-4.5 text-accent" /> Teslimat Bilgileri
            </h2>
            {adim === "adres" ? (
              <form onSubmit={adresiKaydet} className="grid gap-3 sm:grid-cols-2">
                <input
                  required
                  type="email"
                  placeholder="E-posta *"
                  value={form.email}
                  onChange={(e) => alan("email", e.target.value)}
                  className={girdiSinifi}
                />
                <input
                  required
                  placeholder="Ad Soyad *"
                  value={form.customerName}
                  onChange={(e) => alan("customerName", e.target.value)}
                  className={girdiSinifi}
                />
                <input
                  placeholder="Telefon"
                  value={form.phone}
                  onChange={(e) => alan("phone", e.target.value)}
                  className={girdiSinifi}
                />
                <input
                  required
                  placeholder="İl *"
                  value={form.shipCity}
                  onChange={(e) => alan("shipCity", e.target.value)}
                  className={girdiSinifi}
                />
                <input
                  placeholder="İlçe"
                  value={form.shipDistrict}
                  onChange={(e) => alan("shipDistrict", e.target.value)}
                  className={girdiSinifi}
                />
                <textarea
                  required
                  placeholder="Açık adres *"
                  value={form.shipAddress}
                  onChange={(e) => alan("shipAddress", e.target.value)}
                  rows={2}
                  className="rounded-xl border border-line bg-background p-3 text-sm outline-none transition focus:border-accent focus:ring-2 focus:ring-accent/20 sm:col-span-2"
                />
                <button
                  type="submit"
                  disabled={adresYaz.isPending}
                  className="flex h-11 items-center justify-center gap-2 rounded-xl bg-accent font-semibold text-accent-foreground transition hover:bg-accent-hover disabled:opacity-40 sm:col-span-2"
                >
                  {adresYaz.isPending ? <Loader2 className="size-4 animate-spin" /> : null}
                  Ödeme Adımına Geç
                </button>
              </form>
            ) : (
              <div className="flex items-start justify-between gap-3 text-sm">
                <div className="text-soft">
                  <p className="font-medium text-foreground">{form.customerName}</p>
                  <p>{form.shipAddress}</p>
                  <p>
                    {form.shipDistrict ? `${form.shipDistrict}, ` : ""}
                    {form.shipCity}
                  </p>
                  <p>{form.email}</p>
                </div>
                {!oturum ? (
                  <button
                    type="button"
                    onClick={() => setAdim("adres")}
                    className="text-sm font-medium text-accent hover:underline"
                  >
                    Düzenle
                  </button>
                ) : null}
              </div>
            )}
          </section>

          {/* ADIM 2: ÖDEME */}
          {adim === "odeme" ? (
            <section className="rounded-2xl border border-line bg-surface p-5">
              <h2 className="mb-4 flex items-center gap-2 font-semibold">
                <CreditCard className="size-4.5 text-accent" /> Ödeme
              </h2>

              {!oturum ? (
                <div className="space-y-4">
                  <p className="text-sm text-soft">
                    Bu demo, TicariCore'un <strong>test ödeme sağlayıcısını</strong> kullanır —
                    gerçek bir karta gidilmez. Senaryo seçip akışı deneyin:
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {[
                      { v: "", ad: "✓ Başarılı ödeme" },
                      { v: "red", ad: "✗ Kart reddedildi" },
                      { v: "hata", ad: "⚠ Banka iletişim hatası" },
                    ].map((s) => (
                      <button
                        key={s.v}
                        type="button"
                        onClick={() => setSenaryo(s.v)}
                        className={`rounded-xl border px-3 py-2 text-sm font-medium transition ${
                          senaryo === s.v
                            ? "border-accent bg-accent/10 text-accent"
                            : "border-line hover:border-soft"
                        }`}
                      >
                        {s.ad}
                      </button>
                    ))}
                  </div>
                  <button
                    type="button"
                    onClick={odemeyiBaslat}
                    disabled={islemde}
                    className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-accent font-semibold text-accent-foreground transition hover:bg-accent-hover disabled:opacity-40"
                  >
                    {islemde ? (
                      <Loader2 className="size-5 animate-spin" />
                    ) : (
                      <Lock className="size-4.5" />
                    )}
                    Güvenli Ödemeyi Başlat
                  </button>
                  <p className="text-xs text-soft">
                    Bu adımda stok, kur ve kampanyalar sunucuda bir kez daha doğrulanır.
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* 3D Secure simülasyon paneli */}
                  <div className="rounded-xl border border-dashed border-accent/50 bg-accent/5 p-4">
                    <p className="flex items-center gap-2 text-sm font-semibold">
                      <ShieldCheck className="size-4.5 text-accent" /> 3D Secure Doğrulama
                      (simülasyon)
                    </p>
                    <p className="mt-1 break-all font-mono text-xs text-soft">
                      {oturum.redirectUrl || oturum.statusLabel}
                    </p>
                    <p className="mt-2 text-xs text-soft">
                      Gerçek entegrasyonda müşteri bankanın 3D sayfasına yönlendirilir;
                      test sağlayıcısında bu panel o adımı temsil eder.
                    </p>
                  </div>
                  {oturum.errorMessage ? (
                    <p className="flex items-center gap-2 text-sm font-medium text-danger">
                      <XCircle className="size-4" /> {oturum.errorMessage}
                    </p>
                  ) : null}
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={odemeyiOnayla}
                      disabled={islemde}
                      className="flex h-12 flex-1 items-center justify-center gap-2 rounded-xl bg-accent font-semibold text-accent-foreground transition hover:bg-accent-hover disabled:opacity-40"
                    >
                      {islemde ? <Loader2 className="size-5 animate-spin" /> : null}
                      Doğrula ve Öde
                    </button>
                    <button
                      type="button"
                      onClick={odemeyiVazgec}
                      disabled={islemde}
                      className="h-12 rounded-xl border border-line px-4 text-sm font-semibold transition hover:bg-background disabled:opacity-40"
                    >
                      Vazgeç
                    </button>
                  </div>
                </div>
              )}
            </section>
          ) : null}
        </div>

        {/* SİPARİŞ ÖZETİ */}
        <aside className="h-fit rounded-2xl border border-line bg-surface p-4">
          <h2 className="mb-3 font-semibold">Sipariş Özeti</h2>
          <ul className="mb-3 space-y-1.5 text-sm">
            {sepet.lines.map((l) => (
              <li key={l.productUid} className="flex justify-between gap-2">
                <span className="truncate text-soft">
                  {l.name} <span className="text-xs">×{Number(l.quantity)}</span>
                </span>
                <span className="shrink-0">{fiyat(l.lineTotal, sepet.curCode)}</span>
              </li>
            ))}
          </ul>
          <CartTotals sepet={sepet} />
        </aside>
      </div>
    </div>
  );
}
