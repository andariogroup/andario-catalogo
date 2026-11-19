import "server-only";

import { eq } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { googleIntegrationSettings, privacyConsentSettings } from "@/lib/db/schema";
import { catalogOrigin } from "@/lib/seo";
import { apexHostFromOrigin, isGoogleMeasurementEnv, searchConsolePropertyFromOrigin } from "@/lib/google-ids";
import { loadShell } from "@/lib/store";

const DEFAULT_GOOGLE = {
  businessId: 1,
  searchConsoleProperty: "",
  ga4MeasurementId: "",
  ga4PropertyId: "",
  gtmContainerId: "",
  trackingEnabled: false,
  commerceEventsEnabled: true,
  lastSitemapCheckAt: null as Date | null,
  lastSitemapStatus: "",
  lastSitemapDetail: "",
  updatedAt: new Date(0),
  updatedBy: "",
};

const DEFAULT_PRIVACY = {
  businessId: 1,
  noticeEnabled: true,
  policyVersion: "1.0",
  consentExpirationDays: 180,
  noticeTitle: "Tu privacidad importa",
  noticeDescription:
    "Usamos tecnologías esenciales para el funcionamiento de nuestra tienda y, con tu permiso, herramientas de análisis para mejorar tu experiencia. Tú decides.",
  policyPath: "/politicas/privacidad",
  updatedAt: new Date(0),
  updatedBy: "",
};

export async function loadGoogleSettings() {
  const db = getDb();
  if (!db) return { ...DEFAULT_GOOGLE };
  try {
    const [row] = await db.select().from(googleIntegrationSettings).where(eq(googleIntegrationSettings.businessId, 1)).limit(1);
    return row ?? { ...DEFAULT_GOOGLE };
  } catch {
    return { ...DEFAULT_GOOGLE };
  }
}

export async function loadPrivacySettings() {
  const db = getDb();
  if (!db) return { ...DEFAULT_PRIVACY };
  try {
    const [row] = await db.select().from(privacyConsentSettings).where(eq(privacyConsentSettings.businessId, 1)).limit(1);
    return row ?? { ...DEFAULT_PRIVACY };
  } catch {
    return { ...DEFAULT_PRIVACY };
  }
}

export async function publicMeasurementContext() {
  const [shell, google, privacy] = await Promise.all([loadShell(), loadGoogleSettings(), loadPrivacySettings()]);
  const origin = catalogOrigin(shell?.settings.publicUrl ?? "");
  const gtm = google.gtmContainerId.trim().toUpperCase();
  const envOk = isGoogleMeasurementEnv();
  const configured = Boolean(google.trackingEnabled && gtm);
  return {
    origin,
    apexHost: apexHostFromOrigin(origin),
    searchConsoleProperty: searchConsolePropertyFromOrigin(origin) || google.searchConsoleProperty,
    sitemapUrl: `${origin}/sitemap.xml`,
    google,
    privacy,
    measurementAllowed: Boolean(envOk && configured),
    envLabel: process.env.VERCEL_ENV || process.env.NODE_ENV || "development",
  };
}
