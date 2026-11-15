"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { requirePermission } from "@/lib/auth";
import { uploadAsset } from "@/lib/cloudinary";
import { getDb, recordAudit } from "@/lib/db";
import { announcement, banners, branding, business, contentPages, heroSettings, heroSlides, homeSections, mediaAssets, settings, slugRedirects, socialLinks } from "@/lib/db/schema";
import { checked, text, type FormState } from "@/lib/form";
import { heroProblem } from "@/lib/hero";
import { safeHex } from "@/lib/images";
import { publicUrlProblem } from "@/lib/seo";
import { releaseUrls } from "@/lib/media-release";

const NETWORKS = ["instagram", "facebook", "tiktok", "youtube", "website"] as const;
const PAGES = new Set(["privacidad", "terminos", "envios", "cambios"]);

function linkProblem(value: string) {
  if (!value) return "";
  if (value.startsWith("/") && !value.startsWith("//")) return "";
  if (/^https:\/\//i.test(value)) return "";
  return "El enlace tiene que ser una ruta del catálogo, como /catalogo, o empezar por https.";
}

async function storeUpload(file: FormDataEntryValue | null, alt: string) {
  if (!(file instanceof File) || file.size === 0) return "";
  const uploaded = await uploadAsset(new Uint8Array(await file.arrayBuffer()), "image");
  if (!uploaded.ok) throw new Error(uploaded.error);
  const db = getDb();
  if (db) await db.insert(mediaAssets).values({ id: crypto.randomUUID(), kind: "image", url: uploaded.url, alt, bytes: uploaded.bytes });
  return uploaded.url;
}

export async function saveBusinessAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const user = await requirePermission("brand", "write");
  const db = getDb();
  if (!db) return { error: "No hay base de datos.", ok: "" };
  const name = text(formData, "name");
  if (name.length < 2) return { error: "El negocio necesita un nombre.", ok: "" };
  const maps = text(formData, "mapsUrl");
  if (maps && !/^https:\/\/(www\.)?google\.[a-z.]+\/maps/i.test(maps) && !/^https:\/\/maps\.app\.goo\.gl\//i.test(maps)) return { error: "El mapa tiene que ser un enlace https de Google Maps.", ok: "" };
  const email = text(formData, "email");
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { error: "Revisa el correo.", ok: "" };
  const whatsapp = text(formData, "whatsapp");
  if (whatsapp && !/^\d{10,15}$/.test(whatsapp)) return { error: "WhatsApp solo admite dígitos, con indicativo. Ejemplo: 573001112233.", ok: "" };
  const year = text(formData, "yearStarted");
  const yearNumber = year ? Number(year) : null;
  if (year && (!yearNumber || yearNumber < 1900 || yearNumber > 2100)) return { error: "El año de inicio tiene que estar entre 1900 y 2100.", ok: "" };
  const socials = NETWORKS.map((network) => ({ network, url: text(formData, network) }));
  const badSocial = socials.find((item) => item.url && !/^https:\/\//i.test(item.url));
  if (badSocial) return { error: `El enlace de ${badSocial.network} tiene que empezar por https.`, ok: "" };
  let storyImage = "";
  try {
    storyImage = await storeUpload(formData.get("storyImage"), name);
  } catch (error) {
    return { error: error instanceof Error ? error.message : "No pude subir la imagen.", ok: "" };
  }
  const removeImage = formData.get("removeStoryImage") === "1";
  const [previousBusiness] = await db.select({ storyImageUrl: business.storyImageUrl }).from(business).where(eq(business.id, 1)).limit(1);
  await db.update(business).set({
    name,
    slogan: text(formData, "slogan").slice(0, 140),
    shortDescription: text(formData, "short").slice(0, 180),
    description: text(formData, "description").slice(0, 4000),
    city: text(formData, "city").slice(0, 80),
    region: text(formData, "region").slice(0, 80),
    country: text(formData, "country").slice(0, 80) || "Colombia",
    address: text(formData, "address").slice(0, 180),
    mapsUrl: maps,
    phone: text(formData, "phone").slice(0, 20),
    email: email.slice(0, 120),
    whatsapp: whatsapp.slice(0, 20),
    hours: text(formData, "hours").slice(0, 120),
    yearStarted: yearNumber,
    attentionScope: text(formData, "attentionScope").slice(0, 400),
    deliveryText: text(formData, "deliveryText").slice(0, 800),
    commercialTerms: text(formData, "commercialTerms").slice(0, 800),
    storyTitle: text(formData, "storyTitle").slice(0, 120),
    story: text(formData, "story").slice(0, 4000),
    storyImageUrl: storyImage || (removeImage ? "" : undefined),
    commercialMessage: text(formData, "commercialMessage").slice(0, 240),
    updatedAt: new Date(),
  }).where(eq(business.id, 1));
  for (const item of socials) {
    await db.update(socialLinks).set({ url: item.url }).where(eq(socialLinks.network, item.network));
  }
  const nextStory = storyImage || (removeImage ? "" : previousBusiness?.storyImageUrl ?? "");
  if (previousBusiness?.storyImageUrl && previousBusiness.storyImageUrl !== nextStory) await releaseUrls(db, [previousBusiness.storyImageUrl]);
  revalidatePath("/", "layout");
  await recordAudit(user.email, "guardo-negocio", "business");
  return { error: "", ok: `${name} quedó guardado. El catálogo público ya usa estos datos.` };
}

export async function saveBrandingAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const user = await requirePermission("brand", "write");
  const db = getDb();
  if (!db) return { error: "No hay base de datos.", ok: "" };
  const font = text(formData, "fontPair");
  if (font !== "fraunces" && font !== "newsreader") return { error: "Esa pareja de fuentes no está disponible.", ok: "" };
  let logo = "";
  let logoAlt = "";
  let favicon = "";
  let socialImage = "";
  try {
    logo = await storeUpload(formData.get("logo"), "Logo");
    logoAlt = await storeUpload(formData.get("logoAlt"), "Logo alternativo");
    favicon = await storeUpload(formData.get("favicon"), "Favicon");
    socialImage = await storeUpload(formData.get("socialImage"), "Imagen social");
  } catch (error) {
    return { error: error instanceof Error ? error.message : "No pude subir la imagen.", ok: "" };
  }
  const kept = (uploaded: string, flag: string) => uploaded || (formData.get(flag) === "1" ? "" : undefined);
  const logoUrl = kept(logo, "removeLogo");
  const logoAltUrl = kept(logoAlt, "removeLogoAlt");
  const faviconUrl = kept(favicon, "removeFavicon");
  const socialImageUrl = kept(socialImage, "removeSocialImage");
  const [previousBrand] = await db.select({ logoUrl: branding.logoUrl, logoAltUrl: branding.logoAltUrl, faviconUrl: branding.faviconUrl, socialImageUrl: branding.socialImageUrl }).from(branding).where(eq(branding.businessId, 1)).limit(1);
  await db.update(branding).set({
    primaryColor: safeHex(text(formData, "primary"), "#1B4332"),
    secondaryColor: safeHex(text(formData, "secondary"), "#F3EDE3"),
    accentColor: safeHex(text(formData, "accent"), "#C4622D"),
    backgroundColor: safeHex(text(formData, "background"), "#F7F1E8"),
    textColor: safeHex(text(formData, "text"), "#1C1714"),
    mutedColor: safeHex(text(formData, "muted"), "#5E564C"),
    borderColor: safeHex(text(formData, "border"), "#E4D8C8"),
    buttonColor: safeHex(text(formData, "button"), "#1B4332"),
    buttonTextColor: safeHex(text(formData, "buttonText"), "#F7F1E8"),
    fontPair: font,
    radius: String(Math.min(28, Math.max(0, Number(text(formData, "radius")) || 18))),
    showLogo: checked(formData, "showLogo"),
    showName: checked(formData, "showName"),
    showSearch: checked(formData, "showSearch"),
    showHeaderWhatsapp: checked(formData, "showHeaderWhatsapp"),
    stickyHeader: checked(formData, "stickyHeader"),
    ...(logoUrl !== undefined ? { logoUrl } : {}),
    ...(logoAltUrl !== undefined ? { logoAltUrl } : {}),
    ...(faviconUrl !== undefined ? { faviconUrl } : {}),
    ...(socialImageUrl !== undefined ? { socialImageUrl } : {}),
  }).where(eq(branding.businessId, 1));
  const droppedBrand = [
    logoUrl !== undefined && previousBrand?.logoUrl !== logoUrl ? previousBrand?.logoUrl : "",
    logoAltUrl !== undefined && previousBrand?.logoAltUrl !== logoAltUrl ? previousBrand?.logoAltUrl : "",
    faviconUrl !== undefined && previousBrand?.faviconUrl !== faviconUrl ? previousBrand?.faviconUrl : "",
    socialImageUrl !== undefined && previousBrand?.socialImageUrl !== socialImageUrl ? previousBrand?.socialImageUrl : "",
  ].filter((url): url is string => Boolean(url));
  await releaseUrls(db, droppedBrand);
  revalidatePath("/", "layout");
  await recordAudit(user.email, "guardo-apariencia", "brand");
  return { error: "", ok: "La apariencia quedó publicada. El catálogo ya usa estos cambios." };
}

export async function saveHeroAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const user = await requirePermission("content", "write");
  const db = getDb();
  if (!db) return { error: "No hay base de datos.", ok: "" };
  const mode = text(formData, "mode");
  const slides = await db.select().from(heroSlides);
  const problem = heroProblem(mode, slides.filter((slide) => slide.active).length || (text(formData, "title") ? 1 : 0));
  if (mode === "carousel" && problem) return { error: problem, ok: "" };
  if (mode !== "image" && mode !== "video" && mode !== "carousel") return { error: "El modo del hero no existe.", ok: "" };
  const destination = text(formData, "ctaHref");
  if (linkProblem(destination)) return { error: linkProblem(destination), ok: "" };
  const overlayRaw = text(formData, "overlay");
  const overlay = overlayRaw ? Number(overlayRaw) : 35;
  if (!Number.isFinite(overlay) || overlay < 0 || overlay > 80) return { error: "El velo tiene que estar entre 0 y 80.", ok: "" };
  let desktop = "";
  let video = "";
  let videoBytes = 0;
  const [previousHero] = await db.select({ desktopUrl: heroSettings.desktopUrl, mobileUrl: heroSettings.mobileUrl, posterUrl: heroSettings.posterUrl, videoUrl: heroSettings.videoUrl }).from(heroSettings).where(eq(heroSettings.id, 1)).limit(1);
  try {
    desktop = await storeUpload(formData.get("image"), text(formData, "title") || "Hero");
    const videoFile = formData.get("video");
    if (videoFile instanceof File && videoFile.size > 0) {
      const uploaded = await uploadAsset(new Uint8Array(await videoFile.arrayBuffer()), "video");
      if (!uploaded.ok) return { error: uploaded.error, ok: "" };
      video = uploaded.url;
      videoBytes = uploaded.bytes;
    }
  } catch (error) {
    return { error: error instanceof Error ? error.message : "No pude subir el archivo.", ok: "" };
  }
  await db.update(heroSettings).set({
    mode,
    title: text(formData, "title").slice(0, 120),
    subtitle: text(formData, "subtitle").slice(0, 180),
    ctaLabel: text(formData, "ctaLabel").slice(0, 40),
    ctaHref: destination.slice(0, 180),
    align: text(formData, "align") === "center" ? "center" : "left",
    overlay: Math.round(overlay),
    autoplay: checked(formData, "autoplay"),
    loop: checked(formData, "loop"),
    active: checked(formData, "active"),
    ...(desktop ? { desktopUrl: desktop, mobileUrl: desktop, posterUrl: desktop } : formData.get("removeHeroImage") === "1" ? { desktopUrl: "", mobileUrl: "", posterUrl: "" } : {}),
    ...(video ? { videoUrl: video } : formData.get("removeHeroVideo") === "1" ? { videoUrl: "" } : {}),
  }).where(eq(heroSettings.id, 1));
  if (video) await db.insert(mediaAssets).values({ id: crypto.randomUUID(), kind: "video", url: video, alt: (text(formData, "title") || "Video").slice(0, 180), bytes: videoBytes });
  const removeHero = formData.get("removeHeroImage") === "1";
  const nextImage = desktop || (removeHero ? "" : null);
  const nextVideo = video || (formData.get("removeHeroVideo") === "1" ? "" : null);
  await releaseUrls(db, [
    nextImage !== null && previousHero?.desktopUrl !== nextImage ? previousHero?.desktopUrl ?? "" : "",
    nextImage !== null && previousHero?.mobileUrl !== nextImage ? previousHero?.mobileUrl ?? "" : "",
    nextImage !== null && previousHero?.posterUrl !== nextImage ? previousHero?.posterUrl ?? "" : "",
    nextVideo !== null && previousHero?.videoUrl !== nextVideo ? previousHero?.videoUrl ?? "" : "",
  ]);
  revalidatePath("/", "layout");
  await recordAudit(user.email, "guardo-hero", "hero");
  return { error: "", ok: "El hero quedó publicado en la portada." };
}

export async function saveSlideAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const user = await requirePermission("content", "write");
  const db = getDb();
  if (!db) return { error: "No hay base de datos.", ok: "" };
  let desktop = "";
  try {
    desktop = await storeUpload(formData.get("image"), text(formData, "title") || "Diapositiva");
  } catch (error) {
    return { error: error instanceof Error ? error.message : "No pude subir la imagen.", ok: "" };
  }
  if (!desktop && !text(formData, "title")) return { error: "La diapositiva necesita imagen o título.", ok: "" };
  const destination = text(formData, "ctaHref");
  if (linkProblem(destination)) return { error: linkProblem(destination), ok: "" };
  await db.insert(heroSlides).values({
    id: crypto.randomUUID(),
    desktopUrl: desktop,
    mobileUrl: desktop,
    title: text(formData, "title").slice(0, 120),
    subtitle: text(formData, "subtitle").slice(0, 180),
    ctaLabel: text(formData, "ctaLabel").slice(0, 40),
    ctaHref: destination.slice(0, 180),
    sortOrder: Math.min(999, Math.max(0, Number(text(formData, "sortOrder")) || 0)),
    active: true,
  });
  revalidatePath("/", "layout");
  await recordAudit(user.email, "guardo-diapositiva", "hero");
  return { error: "", ok: "La diapositiva quedó publicada en la portada." };
}

export async function deleteSlideAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const user = await requirePermission("content", "write");
  const db = getDb();
  if (!db) return { error: "No hay base de datos.", ok: "" };
  const id = text(formData, "id");
  if (!id) return { error: "No encontré la diapositiva.", ok: "" };
  const [slide] = await db.select({ desktopUrl: heroSlides.desktopUrl, mobileUrl: heroSlides.mobileUrl }).from(heroSlides).where(eq(heroSlides.id, id)).limit(1);
  await db.delete(heroSlides).where(eq(heroSlides.id, id));
  if (slide) await releaseUrls(db, [slide.desktopUrl, slide.mobileUrl]);
  revalidatePath("/", "layout");
  await recordAudit(user.email, "quito-diapositiva", "hero");
  return { error: "", ok: "La diapositiva se quitó de la portada." };
}

export async function saveAnnouncementAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const user = await requirePermission("content", "write");
  const db = getDb();
  if (!db) return { error: "No hay base de datos.", ok: "" };
  const href = text(formData, "href");
  if (linkProblem(href)) return { error: linkProblem(href), ok: "" };
  const background = text(formData, "background");
  const color = text(formData, "color");
  if (!/^#[0-9A-Fa-f]{6}$/.test(background) || !/^#[0-9A-Fa-f]{6}$/.test(color)) return { error: "El aviso necesita colores como #1B4332.", ok: "" };
  const startsOn = text(formData, "startsOn");
  const endsOn = text(formData, "endsOn");
  if ((startsOn && !/^\d{4}-\d{2}-\d{2}$/.test(startsOn)) || (endsOn && !/^\d{4}-\d{2}-\d{2}$/.test(endsOn))) return { error: "Revisa las fechas del aviso.", ok: "" };
  if (startsOn && endsOn && startsOn > endsOn) return { error: "La fecha final tiene que ser igual o posterior a la inicial.", ok: "" };
  await db.update(announcement).set({
    active: checked(formData, "active"),
    text: text(formData, "text").slice(0, 160),
    href: href.slice(0, 180),
    background,
    color,
    dismissible: checked(formData, "dismissible"),
    startsOn,
    endsOn,
  }).where(eq(announcement.id, 1));
  revalidatePath("/", "layout");
  await recordAudit(user.email, "guardo-aviso", "announcement");
  return { error: "", ok: "El aviso quedó publicado en la portada." };
}

export async function saveSectionAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const user = await requirePermission("content", "write");
  const db = getDb();
  if (!db) return { error: "No hay base de datos.", ok: "" };
  const key = text(formData, "key");
  const title = text(formData, "title");
  if (title.length < 2) return { error: "La sección necesita un título.", ok: "" };
  const current = await db.select({ key: homeSections.key }).from(homeSections).where(eq(homeSections.key, key)).limit(1);
  if (!current.length) return { error: "Esa sección no existe.", ok: "" };
  await db.update(homeSections).set({
    title: title.slice(0, 80),
    subtitle: text(formData, "subtitle").slice(0, 160),
    enabled: checked(formData, "enabled"),
    sortOrder: Math.min(999, Math.max(0, Number(text(formData, "sortOrder")) || 0)),
  }).where(eq(homeSections.key, key));
  revalidatePath("/", "layout");
  await recordAudit(user.email, "guardo-seccion", "home");
  return { error: "", ok: `${title} quedó publicada en la portada.` };
}

const PAGE_NAMES: Record<string, string> = { privacidad: "Privacidad", terminos: "Términos", envios: "Envíos", cambios: "Cambios" };

export async function savePageAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const user = await requirePermission("seo", "write");
  const db = getDb();
  if (!db) return { error: "No hay base de datos.", ok: "" };
  const slug = text(formData, "slug");
  if (!PAGES.has(slug)) return { error: "Esa página no se puede crear.", ok: "" };
  const title = text(formData, "title");
  if (title.length < 2) return { error: "La página necesita un título.", ok: "" };
  const published = checked(formData, "published");
  await db.update(contentPages).set({
    title: title.slice(0, 120),
    body: text(formData, "body").slice(0, 8000),
    published,
    updatedAt: new Date(),
  }).where(eq(contentPages.slug, slug));
  revalidatePath("/", "layout");
  revalidatePath(`/politicas/${slug}`);
  await recordAudit(user.email, "guardo-pagina", slug);
  const name = PAGE_NAMES[slug] ?? "La página";
  return { error: "", ok: published ? `${name} quedó publicada.` : `${name} quedó guardada y no se muestra en el catálogo.` };
}

export async function saveBannerAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const user = await requirePermission("content", "write");
  const db = getDb();
  if (!db) return { error: "No hay base de datos.", ok: "" };
  const title = text(formData, "title");
  if (title.length < 2) return { error: "El banner necesita un título.", ok: "" };
  const href = text(formData, "href");
  if (linkProblem(href)) return { error: linkProblem(href), ok: "" };
  let image = "";
  try {
    image = await storeUpload(formData.get("image"), title);
  } catch (error) {
    return { error: error instanceof Error ? error.message : "No pude subir la imagen.", ok: "" };
  }
  await db.insert(banners).values({
    id: crypto.randomUUID(),
    title,
    subtitle: text(formData, "subtitle").slice(0, 160),
    imageUrl: image,
    href: href.slice(0, 180),
    active: true,
    sortOrder: Math.min(999, Math.max(0, Number(text(formData, "sortOrder")) || 0)),
  });
  revalidatePath("/", "layout");
  await recordAudit(user.email, "guardo-banner", "banner");
  return { error: "", ok: "El banner quedó publicado en la portada." };
}

export async function deleteBannerAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const user = await requirePermission("content", "write");
  const db = getDb();
  if (!db) return { error: "No hay base de datos.", ok: "" };
  const id = text(formData, "id");
  if (!id) return { error: "No encontré el banner.", ok: "" };
  const [banner] = await db.select({ imageUrl: banners.imageUrl }).from(banners).where(eq(banners.id, id)).limit(1);
  await db.delete(banners).where(eq(banners.id, id));
  if (banner?.imageUrl) await releaseUrls(db, [banner.imageUrl]);
  revalidatePath("/", "layout");
  await recordAudit(user.email, "quito-banner", "banner");
  return { error: "", ok: "El banner se quitó de la portada." };
}

export async function saveSeoAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const user = await requirePermission("seo", "write");
  const db = getDb();
  if (!db) return { error: "No hay base de datos.", ok: "" };
  const publicUrl = text(formData, "publicUrl").trim().replace(/\/$/, "");
  const urlProblem = publicUrlProblem(publicUrl);
  if (urlProblem) return { error: urlProblem, ok: "" };
  await db.update(settings).set({
    metaTitle: text(formData, "metaTitle").slice(0, 70),
    metaDescription: text(formData, "metaDescription").slice(0, 180),
    publicUrl,
    indexable: checked(formData, "indexable"),
    whatsappGeneral: text(formData, "whatsappGeneral").slice(0, 300),
    whatsappProduct: text(formData, "whatsappProduct").slice(0, 300),
    floatWhatsapp: checked(formData, "floatWhatsapp"),
    floatLabel: text(formData, "floatLabel").slice(0, 24) || "WhatsApp",
    floatSide: text(formData, "floatSide") === "left" ? "left" : "right",
  }).where(eq(settings.businessId, 1));
  revalidatePath("/", "layout");
  await recordAudit(user.email, "guardo-seo", "seo");
  return { error: "", ok: "La configuración quedó guardada." };
}

export async function deleteRedirectAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const user = await requirePermission("seo", "write");
  const db = getDb();
  if (!db) return { error: "No hay base de datos.", ok: "" };
  const fromPath = text(formData, "fromPath");
  if (!fromPath.startsWith("/") || fromPath.startsWith("//") || fromPath.includes("?") || fromPath.includes("\\")) {
    return { error: "Esa ruta anterior no es válida.", ok: "" };
  }
  const deleted = await db.delete(slugRedirects).where(eq(slugRedirects.fromPath, fromPath)).returning({ fromPath: slugRedirects.fromPath });
  if (!deleted.length) return { error: "No encontré esa ruta anterior.", ok: "" };
  revalidatePath("/admin/seo");
  await recordAudit(user.email, "quito-ruta", fromPath);
  return { error: "", ok: "La ruta anterior se quitó." };
}
