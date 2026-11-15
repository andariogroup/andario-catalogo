import type { MetadataRoute } from "next";

export const dynamic = "force-dynamic";
import { catalogOrigin } from "@/lib/seo";
import { loadShell } from "@/lib/store";

export default async function robots(): Promise<MetadataRoute.Robots> {
  const shell = await loadShell().catch(() => null);
  const index = shell?.settings.indexable !== false;
  const origin = catalogOrigin(shell?.settings.publicUrl ?? "");
  return {
    rules: index
      ? { userAgent: "*", allow: "/", disallow: ["/admin", "/qr", "/lista"] }
      : { userAgent: "*", disallow: "/" },
    sitemap: `${origin}/sitemap.xml`,
    host: origin,
  };
}
