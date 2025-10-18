import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig(({ mode }) => {
  const isProd = mode === "production";

  return {
    plugins: [react()],
    base: "/",
    server: {
      port: 1573,
      proxy: {
        "/api": {
          target: isProd
            ? "https://orario-3.onrender.com"
            : "http://localhost:3000",     
          changeOrigin: true,
          secure: false,
        },
      },
    },
    build: {
      outDir: "dist",
      sourcemap: false,
    },
  };
});
