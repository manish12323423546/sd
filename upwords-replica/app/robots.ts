import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  const allow = process.env.ALLOW_INDEXING === "true";
  return allow ? { rules: { userAgent: "*", allow: "/" } } : { rules: { userAgent: "*", disallow: "/" } };
}
