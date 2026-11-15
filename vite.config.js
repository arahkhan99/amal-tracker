import { defineConfig } from "vite";
import { VitePWA } from "vite-plugin-pwa";

// Version shown in Settings → About. The Android CI sets APP_VERSION_NAME (UTC YYYY.MM.DD.HHmm);
// other builds use the same format from the build time.
const pad = n => String(n).padStart(2, "0");
const t = new Date();
const APP_VERSION = process.env.APP_VERSION_NAME ||
  `${t.getUTCFullYear()}.${pad(t.getUTCMonth() + 1)}.${pad(t.getUTCDate())}.${pad(t.getUTCHours())}${pad(t.getUTCMinutes())}`;

export default defineConfig({
  base: "./", // relative paths work for GitHub Pages and inside the Android app
  build: { outDir: "dist", target: "es2019" },
  define: { __APP_VERSION__: JSON.stringify(APP_VERSION) },
  plugins: [
    VitePWA({
      injectRegister: null, // registered manually in main.js, skipped inside the Android app
      registerType: "autoUpdate",
      includeAssets: ["icons/*.png"],
      manifest: {
        name: "Zad",
        short_name: "Zad",
        description: "Track your five prayers, Good Deeds and make-ups. Works offline; everything stays on your phone.",
        theme_color: "#0F3D2E",
        background_color: "#F8F4EA",
        display: "standalone",
        orientation: "portrait",
        start_url: "./",
        scope: "./",
        icons: [
          { src: "icons/icon-192.png", sizes: "192x192", type: "image/png" },
          { src: "icons/icon-512.png", sizes: "512x512", type: "image/png" },
          { src: "icons/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
        ],
      },
      workbox: {
        globPatterns: ["**/*.{js,css,html,png,svg,woff,woff2}"],
        navigateFallback: "index.html",
        // The offline Qurʾān (public/quran, about 6 MB) is not precached: each index, page file and font is
        // kept once it has been opened, so pages read before work offline (cache-first, never refetched).
        runtimeCaching: [{
          urlPattern: ({ url }) => url.pathname.includes("/quran/"),
          handler: "CacheFirst",
          options: { cacheName: "zad-quran", expiration: { maxEntries: 400 }, cacheableResponse: { statuses: [0, 200] } },
        }],
      },
    }),
  ],
  // Tests use local-time dates for a Chicago sample day, so pin the zone (CI runs in UTC).
  test: { environment: "node", env: { TZ: "America/Chicago" } },
});
