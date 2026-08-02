import { gqlClient } from "./client";
import type {
  StorefrontAccount,
  StorefrontAddress,
  StorefrontAuthPayload,
  StorefrontOrder,
} from "./types";

/**
 * Müşteri hesabı — kanal kapsamlıdır: aynı e-posta başka kanalda başka hesaptır.
 * Kayıt için kvkkAccepted=true zorunlu; parola 8-128 karakter.
 * 5 hatalı giriş → 15 dk kilit (backend aynı genel hatayı döndürür).
 */

const HESAP_ALANLARI = `uid email fullName phone channelUid partnerUid
  emailVerified kvkkAccepted marketingConsent lastLogin createdAt`;

const ADRES_ALANLARI = `uid title fullName phone address district city country
  postalCode compName taxNumber taxOffice isDefaultShip isDefaultBill`;

export async function kayitOl(input: {
  email: string;
  password: string;
  fullName?: string;
  phone?: string;
  kvkkAccepted: boolean;
  marketingConsent?: boolean;
}): Promise<StorefrontAuthPayload> {
  const d = await gqlClient<{ storefrontRegister: StorefrontAuthPayload }>(
    `mutation Kayit($email: String!, $password: String!, $fullName: String, $phone: String,
                    $kvkk: Boolean!, $marketing: Boolean) {
      storefrontRegister(email: $email, password: $password, fullName: $fullName,
        phone: $phone, kvkkAccepted: $kvkk, marketingConsent: $marketing) {
        token account { ${HESAP_ALANLARI} }
      }
    }`,
    {
      email: input.email,
      password: input.password,
      fullName: input.fullName ?? "",
      phone: input.phone ?? "",
      kvkk: input.kvkkAccepted,
      marketing: input.marketingConsent ?? false,
    },
  );
  return d.storefrontRegister;
}

export async function girisYap(email: string, password: string): Promise<StorefrontAuthPayload> {
  const d = await gqlClient<{ storefrontLogin: StorefrontAuthPayload }>(
    `mutation Giris($email: String!, $password: String!) {
      storefrontLogin(email: $email, password: $password) { token account { ${HESAP_ALANLARI} } }
    }`,
    { email, password },
  );
  return d.storefrontLogin;
}

export async function beniGetir(token: string): Promise<StorefrontAccount | null> {
  const d = await gqlClient<{ storefrontMe: StorefrontAccount | null }>(
    `query { storefrontMe { ${HESAP_ALANLARI} } }`,
    undefined,
    token,
  );
  return d.storefrontMe;
}

export async function siparislerim(token: string): Promise<StorefrontOrder[]> {
  const d = await gqlClient<{ storefrontOrders: StorefrontOrder[] }>(
    `query { storefrontOrders { uid docNum issueDate total curCode orderState paymentState fulfillmentState } }`,
    undefined,
    token,
  );
  return d.storefrontOrders;
}

export interface StorefrontOrderLine {
  /** Ürün kartı silinmişse ''. */
  productUid: string;
  /** Sipariş anındaki ad snapshot'ı. */
  name: string;
  quantity: string;
  unit: string;
  /** KDV dahil birim fiyat. */
  unitPrice: string;
  /** KDV dahil satır toplamı. */
  lineTotal: string;
}

export interface StorefrontOrderDetail extends StorefrontOrder {
  lines: StorefrontOrderLine[];
}

/** Tek siparişin satırlı detayı — yalnız hesabın kendi siparişi. */
export async function siparisDetay(token: string, uid: string): Promise<StorefrontOrderDetail | null> {
  const d = await gqlClient<{ storefrontOrder: StorefrontOrderDetail | null }>(
    `query Siparis($uid: String!) {
      storefrontOrder(uid: $uid) {
        uid docNum issueDate total curCode orderState paymentState fulfillmentState
        lines { productUid name quantity unit unitPrice lineTotal }
      }
    }`,
    { uid },
    token,
  );
  return d.storefrontOrder;
}

export async function adreslerim(token: string): Promise<StorefrontAddress[]> {
  const d = await gqlClient<{ storefrontAddresses: StorefrontAddress[] }>(
    `query { storefrontAddresses { ${ADRES_ALANLARI} } }`,
    undefined,
    token,
  );
  return d.storefrontAddresses;
}

export async function adresKaydet(
  token: string,
  input: Partial<StorefrontAddress> & { address: string },
  uid = "",
): Promise<StorefrontAddress> {
  const d = await gqlClient<{ storefrontAddressSave: StorefrontAddress }>(
    `mutation AdresKaydet($uid: String, $input: StorefrontAddressInput!) {
      storefrontAddressSave(uid: $uid, input: $input) { ${ADRES_ALANLARI} }
    }`,
    {
      uid,
      input: {
        title: input.title ?? "",
        fullName: input.fullName ?? "",
        phone: input.phone ?? "",
        address: input.address,
        district: input.district ?? "",
        city: input.city ?? "",
        country: input.country ?? "",
        postalCode: input.postalCode ?? "",
        compName: input.compName ?? "",
        taxNumber: input.taxNumber ?? "",
        taxOffice: input.taxOffice ?? "",
        isDefaultShip: input.isDefaultShip ?? false,
        isDefaultBill: input.isDefaultBill ?? false,
      },
    },
    token,
  );
  return d.storefrontAddressSave;
}

export async function adresSil(token: string, uid: string): Promise<void> {
  await gqlClient(
    `mutation AdresSil($uid: String!) { storefrontAddressDelete(uid: $uid) }`,
    { uid },
    token,
  );
}
