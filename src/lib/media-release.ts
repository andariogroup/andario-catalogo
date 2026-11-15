import { and, eq, inArray, ne, or } from "drizzle-orm";
import { destroyAsset } from "@/lib/cloudinary";
import { getDb } from "@/lib/db";
import { banners, branding, business, categories, heroSettings, heroSlides, mediaAssets, productMedia, products, variantMedia, variants } from "@/lib/db/schema";

type Db = NonNullable<ReturnType<typeof getDb>>;

async function urlPinned(db: Db, url: string) {
  if (!url) return true;
  const checks = await Promise.all([
    db.select({ id: categories.id }).from(categories).where(eq(categories.imageUrl, url)).limit(1),
    db.select({ id: banners.id }).from(banners).where(eq(banners.imageUrl, url)).limit(1),
    db.select({ id: branding.businessId }).from(branding).where(or(eq(branding.logoUrl, url), eq(branding.logoAltUrl, url), eq(branding.faviconUrl, url), eq(branding.socialImageUrl, url))).limit(1),
    db.select({ id: business.id }).from(business).where(eq(business.storyImageUrl, url)).limit(1),
    db.select({ id: heroSettings.id }).from(heroSettings).where(or(eq(heroSettings.desktopUrl, url), eq(heroSettings.mobileUrl, url), eq(heroSettings.videoUrl, url), eq(heroSettings.posterUrl, url))).limit(1),
    db.select({ id: heroSlides.id }).from(heroSlides).where(or(eq(heroSlides.desktopUrl, url), eq(heroSlides.mobileUrl, url))).limit(1),
    db.select({ id: products.id }).from(products).where(or(eq(products.videoUrl, url), eq(products.socialImageUrl, url))).limit(1),
    db.select({ id: variants.id }).from(variants).where(eq(variants.imageUrl, url)).limit(1),
  ]);
  return checks.some((rows) => rows.length > 0);
}

export async function releaseUnused(db: Db, mediaIds: string[]) {
  for (const mediaId of [...new Set(mediaIds)].filter(Boolean)) {
    const [linkedProduct] = await db.select({ id: productMedia.id }).from(productMedia).where(eq(productMedia.mediaId, mediaId)).limit(1);
    const [linkedVariant] = await db.select({ id: variantMedia.id }).from(variantMedia).where(eq(variantMedia.mediaId, mediaId)).limit(1);
    if (linkedProduct || linkedVariant) continue;
    const [asset] = await db.select().from(mediaAssets).where(eq(mediaAssets.id, mediaId)).limit(1);
    if (!asset) continue;
    const [twin] = await db.select({ id: mediaAssets.id }).from(mediaAssets).where(and(eq(mediaAssets.url, asset.url), ne(mediaAssets.id, mediaId))).limit(1);
    const pinned = await urlPinned(db, asset.url);
    if (twin || pinned) {
      await db.delete(mediaAssets).where(eq(mediaAssets.id, mediaId));
      continue;
    }
    if (!(await destroyAsset(asset.url))) continue;
    await db.delete(mediaAssets).where(eq(mediaAssets.id, mediaId));
  }
}

export async function releaseUrls(db: Db, urls: string[]) {
  const unique = [...new Set(urls.map((url) => url.trim()).filter(Boolean))];
  if (!unique.length) return;
  const rows = await db.select({ id: mediaAssets.id }).from(mediaAssets).where(inArray(mediaAssets.url, unique));
  await releaseUnused(db, rows.map((row) => row.id));
}
