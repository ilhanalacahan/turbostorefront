import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Kök bu klasördür — üst dizinlerdeki başka lockfile'lar (monorepo içinde
  // klonlandıysa) çalışma kökü sanılmasın.
  turbopack: { root: import.meta.dirname },
  images: {
    // Ürün görselleri TicariCore'un nesne deposundan (MinIO/S3) ya da elle
    // yapıştırılmış harici URL'lerden gelir. Demo şablonu olduğu için liste
    // geniş tutuldu; ÜRETİMDE kendi medya domain'inizle daraltın:
    //   remotePatterns: [{ protocol: "https", hostname: "media.firmaniz.com" }]
    remotePatterns: [
      { protocol: "http", hostname: "localhost" }, // dev MinIO (:9000)
      { protocol: "http", hostname: "*.localhost" },
      { protocol: "https", hostname: "**" }, // harici görsel URL'leri (demo)
    ],
  },
};

export default nextConfig;
