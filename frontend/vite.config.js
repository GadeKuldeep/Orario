import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Detect environment
const isProd = import.meta.env?.MODE === "production";

export default defineConfig({
  plugins: [react()],
  base: "/",
  server: {
    port: 1573,
    proxy: !isProd ? { // Proxy only in development
      "/api": {
        target: "http://localhost:3000/",
        changeOrigin: true,
        secure: false,
      },
    } : undefined, // No proxy in production
  },
  build: {
    outDir: "dist",
    sourcemap: false,
  },
});