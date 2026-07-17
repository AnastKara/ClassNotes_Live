import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tsconfigPaths from "vite-tsconfig-paths";
import tailwindcss from "@tailwindcss/vite";
import tanstackRouter from "@tanstack/router-plugin/vite";
import { fileURLToPath } from "url";
import { dirname } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  plugins: [
    tanstackRouter({
      autoCodeSplitting: true,
      // Disable SSR since all routes use ssr: false
      ssr: false,
    }),
    react(),
    tsconfigPaths(),
    tailwindcss(),
  ],
  css: {
    devSourcemap: true,
  },
  build: {
    rollupOptions: {
      output: {
        assetFileNames: (assetInfo) => {
          if (assetInfo.name?.endsWith(".css")) {
            return "assets/[name]-[hash][extname]";
          }
          return "assets/[name]-[hash][extname]";
        },
      },
    },
  },
  // Fix for node:async_hooks being externalized for browser compatibility
  // This is needed because TanStack Start with Nitro bundles server code for client
  define: {
    // Provide empty polyfills for Node.js built-ins
    global: "globalThis",
    "process.env": "process.env ?? {}",
  },
  resolve: {
    alias: {
      "node:async_hooks": `${__dirname}/src/polyfills/async-hooks.ts`,
      async_hooks: `${__dirname}/src/polyfills/async-hooks.ts`,
    },
  },
  ssr: {
    // Externalize Node.js built-ins for SSR
    external: ["node:async_hooks", "async_hooks"],
  },
});
