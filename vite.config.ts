import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
export default defineConfig(({ isSsrBuild }) => ({
  plugins: [react()],
  server: { host: "0.0.0.0" },
  build: {
    rollupOptions: {
      output: {
        manualChunks: isSsrBuild
          ? undefined
          : {
              "vendor-react": ["react", "react-dom", "react-router-dom"],
              "vendor-auth": ["@supabase/supabase-js"],
              "vendor-validation": ["zod"],
              "vendor-forms": ["react-hook-form", "@hookform/resolvers/zod"],
            },
      },
    },
  },
}));
