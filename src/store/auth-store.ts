"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

import type { StorefrontAccount } from "@/lib/api/types";

/**
 * Müşteri oturumu. Token, storefront JWT'sidir (typ:"storefront" damgalı) —
 * back-office API'sinde geçmez; kanalı, publishable key'in kanalıyla
 * backend'de çapraz denetlenir.
 *
 * Demo sadeliği için localStorage'ta saklanır. Üretim sertleştirmesi
 * isteyenler için README'de httpOnly cookie'ye taşıma notu vardır.
 */
interface AuthState {
  token: string;
  account: StorefrontAccount | null;
  signIn: (token: string, account: StorefrontAccount) => void;
  signOut: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      token: "",
      account: null,
      signIn: (token, account) => set({ token, account }),
      signOut: () => set({ token: "", account: null }),
    }),
    { name: "tsf-hesap" },
  ),
);
