import { boolean, integer, numeric, pgTable, primaryKey, text, timestamp, unique } from "drizzle-orm/pg-core";

export const users = pgTable("users", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  role: text("role").notNull(),
  active: boolean("active").notNull().default(true),
  lastLoginAt: timestamp("last_login_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const business = pgTable("business", {
  id: integer("id").primaryKey().default(1),
  name: text("name").notNull(),
  slogan: text("slogan").notNull().default(""),
  shortDescription: text("short_description").notNull().default(""),
  description: text("description").notNull().default(""),
  city: text("city").notNull().default(""),
  region: text("region").notNull().default(""),
  country: text("country").notNull().default("Colombia"),
  address: text("address").notNull().default(""),
  mapsUrl: text("maps_url").notNull().default(""),
  phone: text("phone").notNull().default(""),
  email: text("email").notNull().default(""),
  whatsapp: text("whatsapp").notNull().default(""),
  hours: text("hours").notNull().default(""),
  currency: text("currency").notNull().default("COP"),
  currencySymbol: text("currency_symbol").notNull().default("$"),
  yearStarted: integer("year_started"),
  attentionScope: text("attention_scope").notNull().default(""),
  deliveryText: text("delivery_text").notNull().default(""),
  commercialTerms: text("commercial_terms").notNull().default(""),
  storyTitle: text("story_title").notNull().default(""),
  story: text("story").notNull().default(""),
  storyImageUrl: text("story_image_url").notNull().default(""),
  commercialMessage: text("commercial_message").notNull().default(""),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const branding = pgTable("business_branding", {
  businessId: integer("business_id").primaryKey(),
  logoUrl: text("logo_url").notNull().default(""),
  logoAltUrl: text("logo_alt_url").notNull().default(""),
  faviconUrl: text("favicon_url").notNull().default(""),
  socialImageUrl: text("social_image_url").notNull().default(""),
  primaryColor: text("primary_color").notNull().default("#1B4332"),
  secondaryColor: text("secondary_color").notNull().default("#F3EDE3"),
  accentColor: text("accent_color").notNull().default("#C4622D"),
  backgroundColor: text("background_color").notNull().default("#F7F1E8"),
  textColor: text("text_color").notNull().default("#1C1714"),
  mutedColor: text("muted_color").notNull().default("#5E564C"),
  borderColor: text("border_color").notNull().default("#E4D8C8"),
  buttonColor: text("button_color").notNull().default("#1B4332"),
  buttonTextColor: text("button_text_color").notNull().default("#F7F1E8"),
  fontPair: text("font_pair").notNull().default("fraunces"),
  radius: text("radius").notNull().default("18"),
  showLogo: boolean("show_logo").notNull().default(true),
  showName: boolean("show_name").notNull().default(true),
  showSearch: boolean("show_search").notNull().default(true),
  showHeaderWhatsapp: boolean("show_header_whatsapp").notNull().default(true),
  stickyHeader: boolean("sticky_header").notNull().default(true),
});

export const settings = pgTable("business_settings", {
  businessId: integer("business_id").primaryKey(),
  metaTitle: text("meta_title").notNull().default(""),
  metaDescription: text("meta_description").notNull().default(""),
  publicUrl: text("public_url").notNull().default(""),
  indexable: boolean("indexable").notNull().default(true),
  whatsappGeneral: text("whatsapp_general").notNull().default(""),
  whatsappProduct: text("whatsapp_product").notNull().default(""),
  floatWhatsapp: boolean("float_whatsapp").notNull().default(true),
  floatLabel: text("float_label").notNull().default("WhatsApp"),
  floatSide: text("float_side").notNull().default("right"),
  quoteRetentionDays: integer("quote_retention_days").notNull().default(365),
});

export const socialLinks = pgTable("business_social_links", {
  id: text("id").primaryKey(),
  network: text("network").notNull(),
  url: text("url").notNull().default(""),
});

export const mediaAssets = pgTable("media_assets", {
  id: text("id").primaryKey(),
  kind: text("kind").notNull(),
  url: text("url").notNull(),
  alt: text("alt").notNull().default(""),
  width: integer("width"),
  height: integer("height"),
  bytes: integer("bytes").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const heroSettings = pgTable("hero_settings", {
  id: integer("id").primaryKey().default(1),
  mode: text("mode").notNull().default("image"),
  desktopUrl: text("desktop_url").notNull().default(""),
  mobileUrl: text("mobile_url").notNull().default(""),
  videoUrl: text("video_url").notNull().default(""),
  posterUrl: text("poster_url").notNull().default(""),
  title: text("title").notNull().default(""),
  subtitle: text("subtitle").notNull().default(""),
  ctaLabel: text("cta_label").notNull().default(""),
  ctaHref: text("cta_href").notNull().default(""),
  align: text("align").notNull().default("left"),
  valign: text("valign").notNull().default("end"),
  height: text("height").notNull().default("78vh"),
  overlay: integer("overlay").notNull().default(35),
  autoplay: boolean("autoplay").notNull().default(false),
  loop: boolean("loop").notNull().default(true),
  active: boolean("active").notNull().default(true),
});

export const heroSlides = pgTable("hero_slides", {
  id: text("id").primaryKey(),
  desktopUrl: text("desktop_url").notNull().default(""),
  mobileUrl: text("mobile_url").notNull().default(""),
  title: text("title").notNull().default(""),
  subtitle: text("subtitle").notNull().default(""),
  ctaLabel: text("cta_label").notNull().default(""),
  ctaHref: text("cta_href").notNull().default(""),
  align: text("align").notNull().default("left"),
  overlay: integer("overlay").notNull().default(35),
  sortOrder: integer("sort_order").notNull().default(0),
  active: boolean("active").notNull().default(true),
});

export const announcement = pgTable("announcement_bar", {
  id: integer("id").primaryKey().default(1),
  active: boolean("active").notNull().default(false),
  text: text("text").notNull().default(""),
  href: text("href").notNull().default(""),
  background: text("background").notNull().default("#1B4332"),
  color: text("color").notNull().default("#F7F1E8"),
  dismissible: boolean("dismissible").notNull().default(true),
  startsOn: text("starts_on").notNull().default(""),
  endsOn: text("ends_on").notNull().default(""),
});

export const homeSections = pgTable("home_sections", {
  key: text("key").primaryKey(),
  title: text("title").notNull(),
  subtitle: text("subtitle").notNull().default(""),
  enabled: boolean("enabled").notNull().default(true),
  sortOrder: integer("sort_order").notNull().default(0),
});

export const banners = pgTable("promotional_banners", {
  id: text("id").primaryKey(),
  title: text("title").notNull(),
  subtitle: text("subtitle").notNull().default(""),
  imageUrl: text("image_url").notNull().default(""),
  href: text("href").notNull().default(""),
  active: boolean("active").notNull().default(true),
  sortOrder: integer("sort_order").notNull().default(0),
});

export const contentPages = pgTable("content_pages", {
  slug: text("slug").primaryKey(),
  title: text("title").notNull(),
  body: text("body").notNull().default(""),
  published: boolean("published").notNull().default(false),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const categories = pgTable("categories", {
  id: text("id").primaryKey(),
  parentId: text("parent_id"),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  description: text("description").notNull().default(""),
  imageUrl: text("image_url").notNull().default(""),
  sortOrder: integer("sort_order").notNull().default(0),
  status: text("status").notNull().default("active"),
  showOnHome: boolean("show_on_home").notNull().default(true),
  seoTitle: text("seo_title").notNull().default(""),
  seoDescription: text("seo_description").notNull().default(""),
});

export const products = pgTable("products", {
  id: text("id").primaryKey(),
  sku: text("sku").notNull().default(""),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  shortDescription: text("short_description").notNull().default(""),
  description: text("description").notNull().default(""),
  kind: text("kind").notNull().default("physical"),
  categoryId: text("category_id"),
  pricePesos: numeric("price_pesos", { precision: 14, scale: 0 }),
  comparePesos: numeric("compare_pesos", { precision: 14, scale: 0 }),
  priceMode: text("price_mode").notNull().default("fixed"),
  status: text("status").notNull().default("draft"),
  availability: text("availability").notNull().default("available"),
  featured: boolean("featured").notNull().default(false),
  sortOrder: integer("sort_order").notNull().default(0),
  videoUrl: text("video_url").notNull().default(""),
  seoTitle: text("seo_title").notNull().default(""),
  seoDescription: text("seo_description").notNull().default(""),
  socialImageUrl: text("social_image_url").notNull().default(""),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const productMedia = pgTable("product_media", {
  id: text("id").primaryKey(),
  productId: text("product_id").notNull(),
  mediaId: text("media_id").notNull(),
  sortOrder: integer("sort_order").notNull().default(0),
});

export const productTags = pgTable("product_tags", {
  productId: text("product_id").notNull(),
  tag: text("tag").notNull(),
}, (table) => [primaryKey({ columns: [table.productId, table.tag] })]);

export const attributes = pgTable("attribute_definitions", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  code: text("code").notNull().unique(),
  kind: text("kind").notNull(),
  unit: text("unit").notNull().default(""),
  required: boolean("required").notNull().default(false),
  visible: boolean("visible").notNull().default(true),
  filterable: boolean("filterable").notNull().default(false),
  sortOrder: integer("sort_order").notNull().default(0),
});

export const attributeOptions = pgTable("attribute_options", {
  id: text("id").primaryKey(),
  attributeId: text("attribute_id").notNull(),
  label: text("label").notNull(),
  sortOrder: integer("sort_order").notNull().default(0),
});

export const categoryAttributes = pgTable("category_attributes", {
  categoryId: text("category_id").notNull(),
  attributeId: text("attribute_id").notNull(),
}, (table) => [primaryKey({ columns: [table.categoryId, table.attributeId] })]);

export const productAttributeValues = pgTable("product_attribute_values", {
  id: text("id").primaryKey(),
  productId: text("product_id").notNull(),
  attributeId: text("attribute_id").notNull(),
  value: text("value").notNull().default(""),
}, (table) => [unique("product_attribute_unique").on(table.productId, table.attributeId)]);

export const variants = pgTable("product_variants", {
  id: text("id").primaryKey(),
  productId: text("product_id").notNull(),
  sku: text("sku").notNull().default(""),
  pricePesos: numeric("price_pesos", { precision: 14, scale: 0 }),
  availability: text("availability").notNull().default("available"),
  imageUrl: text("image_url").notNull().default(""),
  signature: text("signature").notNull(),
});

export const variantValues = pgTable("variant_attribute_values", {
  variantId: text("variant_id").notNull(),
  attributeId: text("attribute_id").notNull(),
  optionId: text("option_id").notNull(),
}, (table) => [primaryKey({ columns: [table.variantId, table.attributeId] })]);

export const variantMedia = pgTable("variant_media", {
  id: text("id").primaryKey(),
  variantId: text("variant_id").notNull(),
  mediaId: text("media_id").notNull(),
  sortOrder: integer("sort_order").notNull().default(0),
});

export const quotes = pgTable("quote_requests", {
  id: text("id").primaryKey(),
  reference: text("reference").notNull().unique(),
  name: text("name").notNull(),
  phone: text("phone").notNull(),
  email: text("email").notNull().default(""),
  city: text("city").notNull().default(""),
  message: text("message").notNull().default(""),
  consent: boolean("consent").notNull().default(false),
  status: text("status").notNull().default("nueva"),
  managedBy: text("managed_by").notNull().default(""),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const quoteItems = pgTable("quote_request_items", {
  id: text("id").primaryKey(),
  quoteId: text("quote_id").notNull(),
  productId: text("product_id"),
  variantId: text("variant_id"),
  productName: text("product_name").notNull(),
  sku: text("sku").notNull().default(""),
  variantLabel: text("variant_label").notNull().default(""),
  unitPrice: numeric("unit_price", { precision: 14, scale: 0 }),
  quantity: integer("quantity").notNull(),
});

export const quoteNotes = pgTable("quote_request_notes", {
  id: text("id").primaryKey(),
  quoteId: text("quote_id").notNull(),
  authorEmail: text("author_email").notNull(),
  body: text("body").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const analyticsEvents = pgTable("analytics_events", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  path: text("path").notNull().default(""),
  productId: text("product_id"),
  source: text("source").notNull().default(""),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const slugRedirects = pgTable("slug_redirects", {
  id: text("id").primaryKey(),
  fromPath: text("from_path").notNull().unique(),
  toPath: text("to_path").notNull(),
});

export const rateLimits = pgTable("rate_limits", {
  key: text("key").primaryKey(),
  count: integer("count").notNull(),
  windowStart: timestamp("window_start", { withTimezone: true }).notNull(),
});

export const auditEvents = pgTable("audit_events", {
  id: text("id").primaryKey(),
  actor: text("actor").notNull(),
  action: text("action").notNull(),
  entity: text("entity").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const googleIntegrationSettings = pgTable("google_integration_settings", {
  businessId: integer("business_id").primaryKey().default(1),
  searchConsoleProperty: text("search_console_property").notNull().default(""),
  ga4MeasurementId: text("ga4_measurement_id").notNull().default(""),
  ga4PropertyId: text("ga4_property_id").notNull().default(""),
  gtmContainerId: text("gtm_container_id").notNull().default(""),
  trackingEnabled: boolean("tracking_enabled").notNull().default(false),
  commerceEventsEnabled: boolean("commerce_events_enabled").notNull().default(true),
  lastSitemapCheckAt: timestamp("last_sitemap_check_at", { withTimezone: true }),
  lastSitemapStatus: text("last_sitemap_status").notNull().default(""),
  lastSitemapDetail: text("last_sitemap_detail").notNull().default(""),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  updatedBy: text("updated_by").notNull().default(""),
});

export const privacyConsentSettings = pgTable("privacy_consent_settings", {
  businessId: integer("business_id").primaryKey().default(1),
  noticeEnabled: boolean("notice_enabled").notNull().default(true),
  policyVersion: text("policy_version").notNull().default("1.0"),
  consentExpirationDays: integer("consent_expiration_days").notNull().default(180),
  noticeTitle: text("notice_title").notNull().default("Tu privacidad importa"),
  noticeDescription: text("notice_description").notNull().default(
    "Usamos tecnologías esenciales para el funcionamiento de nuestra tienda y, con tu permiso, herramientas de análisis para mejorar tu experiencia. Tú decides.",
  ),
  policyPath: text("policy_path").notNull().default("/politicas/privacidad"),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  updatedBy: text("updated_by").notNull().default(""),
});
