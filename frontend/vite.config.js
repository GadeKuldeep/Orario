import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 1573, // your frontend dev port
    proxy: {
      "/api": {
        target: "https://orario-3.onrender.com", // backend server
        changeOrigin: true,
      },
    },
  },
});
