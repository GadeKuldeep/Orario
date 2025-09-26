import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  base: '/', // ⬅️ ADD THIS LINE - crucial for SPA routing
  server: {
    port: 1573,
    proxy: {
      "/api": {
        target: "https://orario-3.onrender.com",
        changeOrigin: true,
      },
    },
  },
  build: {
    outDir: 'dist', // ⬅️ ADD build configuration
    sourcemap: false // Optional: reduces bundle size
  }
});