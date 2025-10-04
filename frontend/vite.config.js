import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Detect environment the Vite way
const isProd = import.meta.env?.MODE === "production";

export default defineConfig({
  plugins: [react()],
  base: "/", // crucial for SPA routing
  server: {
    port: 1573,
    proxy: {
      "/api": {
        target: isProd
          ? "https://orario-3.onrender.com" // Render backend
          : "http://localhost:3000/",        // Local backend
        changeOrigin: true,
        secure: false,
      },
    },
  },
  build: {
    outDir: "dist",
    sourcemap: false,
  },
});
