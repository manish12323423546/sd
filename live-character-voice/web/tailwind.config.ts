import type { Config } from "tailwindcss";

// Altercast brand (brand/BRAND.md): midnight, glass panels, signal violet → aqua.
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        bg: "#070910",
        panel: "#0F121B",
        raised: "#161A26",
        line: "#1E2331",
        ink: "#F4F6FB",
        muted: "#8B93A7",
        accent: "#7C5CFF",
        aqua: "#22D3EE",
        calm: "#5BC0BE",
        neutral: "#8A97A8",
        excited: "#F5A524",
        peak: "#FF4D6D",
        ok: "#34D399",
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
        display: ["Sora", "Inter", "system-ui", "sans-serif"],
        mono: ["JetBrains Mono", "ui-monospace", "monospace"],
      },
      borderRadius: { panel: "18px" },
      boxShadow: {
        glow: "0 0 0 1px rgba(124,92,255,.4), 0 10px 40px -10px rgba(124,92,255,.55)",
        card: "0 1px 0 0 rgba(255,255,255,.04) inset, 0 20px 40px -24px rgba(0,0,0,.8)",
      },
      keyframes: {
        bar: { "0%,100%": { transform: "scaleY(.25)" }, "50%": { transform: "scaleY(1)" } },
        rise: { from: { opacity: "0", transform: "translateY(8px)" }, to: { opacity: "1", transform: "none" } },
        shimmer: { from: { backgroundPosition: "200% 0" }, to: { backgroundPosition: "-200% 0" } },
        ring: { "0%": { boxShadow: "0 0 0 0 rgba(243,18,96,.6)" }, "100%": { boxShadow: "0 0 0 14px rgba(243,18,96,0)" } },
      },
      animation: {
        bar: "bar 1.1s ease-in-out infinite",
        rise: "rise .45s cubic-bezier(.2,.7,.2,1) both",
        shimmer: "shimmer 2.2s linear infinite",
        ring: "ring 1.4s ease-out infinite",
      },
    },
  },
  plugins: [],
} satisfies Config;
