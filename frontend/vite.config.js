import { defineConfig } from "vite";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  server: {
    port: 5173,
    proxy: {
      "/api": "http://localhost:3000",
    },
  },
  plugins: [
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["favicon.svg", "pwa-192.png", "pwa-512.png"],
      manifest: {
        name: "Mercado Giro Rápido",
        short_name: "Giro Rápido",
        description: "Controle de validade e leitura de código de barras",
        theme_color: "#2b4a72",
        background_color: "#2b4a72",
        display: "standalone",
        orientation: "portrait",
        lang: "pt-BR",
        icons: [
          {
            src: "pwa-192.png",
            sizes: "192x192",
            type: "image/png",
          },
          {
            src: "pwa-512.png",
            sizes: "512x512",
            type: "image/png",
          },
        ],
      },
      workbox: {
        navigateFallback: "/index.html",
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
            handler: "CacheFirst",
            options: {
              cacheName: "google-fonts-cache",
            },
          },
        ],
      },
    }),
  ],
});
