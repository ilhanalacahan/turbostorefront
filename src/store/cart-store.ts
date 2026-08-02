"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

/**
 * Sepet kimliği + çekmece durumu.
 *
 * cartUid MİSAFİR SEPETİNİN ANAHTARIDIR: backend'de ayrı token yok, uid'i
 * bilen sepeti okur/yazar. localStorage'ta saklanır ki sayfa yenilense de
 * sepet kaybolmasın. Girişten sonra cartMerge dönüşünde GÜNCELLENİR
 * (birleşmede uid değişebilir). Sipariş tamamlanınca temizlenir.
 *
 * Çekmece (slide-over) durumu persist EDİLMEZ — sayfa açılışında sepetin
 * kendiliğinden açılması istenmez.
 */
interface CartState {
  cartUid: string;
  drawerOpen: boolean;
  setCartUid: (uid: string) => void;
  clearCart: () => void;
  openDrawer: () => void;
  closeDrawer: () => void;
}

export const useCartStore = create<CartState>()(
  persist(
    (set) => ({
      cartUid: "",
      drawerOpen: false,
      setCartUid: (uid) => set({ cartUid: uid }),
      clearCart: () => set({ cartUid: "" }),
      openDrawer: () => set({ drawerOpen: true }),
      closeDrawer: () => set({ drawerOpen: false }),
    }),
    {
      name: "tsf-sepet",
      partialize: (s) => ({ cartUid: s.cartUid }),
    },
  ),
);
