import type { Config } from "tailwindcss";

// Visual style: docs/07 §7.7, refreshed (V2.3) — deep stage-black, glass panels, electric accent.
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        bg: "#06080C",
        panel: "#0E131B",
        raised: "#141B26",
        line: "#1C2532",
        ink: "#EEF3FA",
        muted: "#8592A6",
        accent: "#4FA3FF",
        violet: "#8B6CFF",
        calm: "#5BC0BE",
        neutral: "#8A97A8",
        excited: "#F5A524",
        peak: "#F31260",
        ok: "#3DDC97",
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
        display: ["Sora", "Inter", "system-ui", "sans-serif"],
        mono: ["JetBrains Mono", "ui-monospace", "monospace"],
      },
      borderRadius: { panel: "16px" },
      boxShadow: {
        glow: "0 0 0 1px rgba(79,163,255,.35), 0 8px 40px -8px rgba(79,163,255,.45)",
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
