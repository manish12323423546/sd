import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

// Dev server proxies the API and WebSocket to FastAPI on :8000 (docs/02, docs/11).
export default defineConfig({
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
