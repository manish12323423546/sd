import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    rules: {
      // The replica ports the original markup; images are already served as AVIF/WebP at the captured sizes.
      "@next/next/no-img-element": "off",
    },
  },
  // rebrand/*.js are Node build scripts run by tools/convert.js, not app code.
  globalIgnores([".next/**", "out/**", "build/**", "next-env.d.ts", "tools/**", "rebrand/*.js"]),
]);

export default eslintConfig;
