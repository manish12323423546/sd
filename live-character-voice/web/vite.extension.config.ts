import { defineConfig } from "vite";

// Builds the shared live relay for the Chrome extension (no React): extension/lib/live-core.js
export default defineConfig({
  publicDir: false,
  build: {
    outDir: "../extension/lib",
    emptyOutDir: false,
    lib: { entry: "src/live/extension-entry.ts", name: "LCVCore", formats: ["iife"], fileName: () => "live-core.js" },
    minify: false,
  },
});
