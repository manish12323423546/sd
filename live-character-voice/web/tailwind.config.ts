import type { Config } from "tailwindcss";

// Visual style from docs/07 §7.7.
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        bg: "#0B0F14",
        panel: "#121821",
        line: "#1E2733",
        ink: "#E6EDF5",
        muted: "#8A97A8",
        accent: "#4FA3FF",
        calm: "#5BC0BE",
        neutral: "#8A97A8",
        excited: "#F5A524",
        peak: "#F31260",
      },
      fontFamily: { sans: ["Sora", "system-ui", "sans-serif"] },
      borderRadius: { panel: "12px" },
    },
  },
  plugins: [],
} satisfies Config;
