import type { MetadataRoute } from "next";
import routes from "@/lib/routes.json";
import { SITE_URL } from "@/lib/site";

/** Every public page once (paginated lists are reachable from their first page). */
export default function sitemap(): MetadataRoute.Sitemap {
  const seen = new Set<string>();
  const out: MetadataRoute.Sitemap = [];
  for (const r of routes as { baseRoute: string; page: number }[]) {
    const p = r.baseRoute;
    if (seen.has(p) || p === "/404" || p === "/checkout" || p.startsWith("/user/") || p.startsWith("/utility/")) continue;
    seen.add(p);
    const depth = p === "/" ? 0 : p.split("/").length - 1;
    out.push({
      url: `${SITE_URL}${p}`,
      lastModified: new Date(),
      changeFrequency: p === "/" || p === "/shop" ? "weekly" : "monthly",
      priority: p === "/" ? 1 : depth === 1 ? 0.8 : 0.6,
    });
  }
  return out;
}
