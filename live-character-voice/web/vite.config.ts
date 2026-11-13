import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

// Dev server proxies the API and WebSocket to FastAPI on :8000 (docs/02, docs/11).
export default defineConfig({
  // VITE_BASE: the path the app is served under, e.g. "/altercast/" on GitHub Pages (default "/")
  base: (globalThis as { process?: { env: Record<string, string | undefined> } }).process?.env.VITE_BASE ?? "/",
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      "/api": "http://localhost:8000",
      "/media": "http://localhost:8000",
      "/ws": { target: "ws://localhost:8000", ws: true },
    },
  },
  test: {
    include: ["src/**/*.test.ts", "src/**/*.test.tsx"],
  },
});
