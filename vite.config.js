import { defineConfig } from "vite";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  base: "./", // relative paths work for GitHub Pages and inside the Android app
  build: { outDir: "dist", target: "es2019" },
  plugins: [
    VitePWA({
      injectRegister: null, // registered manually in main.js, skipped inside the Android app
      registerType: "autoUpdate",
      includeAssets: ["icons/*.png"],
      manifest: {
        name: "Prayer & Amal Tracker",
        short_name: "Amal Tracker",
        description: "Track your five prayers, daily amal and qada. Works offline; everything stays on your phone.",
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
      },
    }),
  ],
  test: { environment: "node" },
});
