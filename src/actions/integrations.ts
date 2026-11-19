"use server";

import { revalidatePath } from "next/cache";
import { requirePermission } from "@/lib/auth";
import { getDb, recordAudit } from "@/lib/db";
import { googleIntegrationSettings, privacyConsentSettings } from "@/lib/db/schema";
import { checked, text, type FormState } from "@/lib/form";
import {
  ga4IdProblem,
  ga4PropertyIdProblem,
  gtmIdProblem,
  normalizeGa4Id,
  normalizeGtmId,
  searchConsolePropertyFromOrigin,
} from "@/lib/google-ids";
import { catalogOrigin } from "@/lib/seo";
import { loadShell } from "@/lib/store";

export async function saveGoogleIntegrationsAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const user = await requirePermission("integrations", "write");
  const db = getDb();
  if (!db) return { error: "No hay base de datos.", ok: "" };

  const ga4MeasurementId = normalizeGa4Id(text(formData, "ga4MeasurementId"));
  const ga4PropertyId = text(formData, "ga4PropertyId");
  const gtmContainerId = normalizeGtmId(text(formData, "gtmContainerId"));
  const trackingEnabled = checked(formData, "trackingEnabled");
  const commerceEventsEnabled = checked(formData, "commerceEventsEnabled");

  const ga4Problem = ga4IdProblem(ga4MeasurementId);
  if (ga4Problem) return { error: ga4Problem, ok: "" };
  const propProblem = ga4PropertyIdProblem(ga4PropertyId);
  if (propProblem) return { error: propProblem, ok: "" };
  const gtmProblem = gtmIdProblem(gtmContainerId);
  if (gtmProblem) return { error: gtmProblem, ok: "" };

  if (trackingEnabled && !gtmContainerId) {
    return { error: "Para activar la medición necesitas un ID de contenedor GTM.", ok: "" };
  }
  if (trackingEnabled && !ga4MeasurementId) {
    return {
      error: "Guarda el ID de GA4 como referencia y configúralo también dentro de GTM.",
      ok: "",
    };
  }

  const shell = await loadShell().catch(() => null);
  const origin = catalogOrigin(shell?.settings.publicUrl ?? "");
  const searchConsoleProperty = searchConsolePropertyFromOrigin(origin);

  await db
    .insert(googleIntegrationSettings)
    .values({
      businessId: 1,
      searchConsoleProperty,
      ga4MeasurementId,
      ga4PropertyId,
      gtmContainerId,
      trackingEnabled,
      commerceEventsEnabled,
      updatedAt: new Date(),
      updatedBy: user.email,
    })
    .onConflictDoUpdate({
      target: googleIntegrationSettings.businessId,
      set: {
        searchConsoleProperty,
        ga4MeasurementId,
        ga4PropertyId,
        gtmContainerId,
        trackingEnabled,
        commerceEventsEnabled,
        updatedAt: new Date(),
        updatedBy: user.email,
      },
    });

  revalidatePath("/", "layout");
  revalidatePath("/admin/integraciones/google");
  await recordAudit(user.email, "guardo-integraciones-google", "google");
  return {
    error: "",
    ok: trackingEnabled
      ? "Configuración guardada. Recuerda publicar el contenedor GTM con el ID de GA4."
      : "Configuración guardada. La medición permanece desactivada.",
  };
}

export async function diagnoseSitemapAction(prev: FormState, formData: FormData): Promise<FormState> {
  void prev;
  void formData;
  const user = await requirePermission("integrations", "write");
  const db = getDb();
  if (!db) return { error: "No hay base de datos.", ok: "" };

  const shell = await loadShell().catch(() => null);
  const origin = catalogOrigin(shell?.settings.publicUrl ?? "");
  if (!/^https:\/\//i.test(origin) || /localhost/i.test(origin)) {
    return {
      error: "Define primero la URL pública https del catálogo en SEO (sin localhost).",
      ok: "",
    };
  }

  const sitemapUrl = `${origin}/sitemap.xml`;
  let status = "error";
  let detail = "";
  try {
    const response = await fetch(sitemapUrl, {
      method: "GET",
      redirect: "follow",
      cache: "no-store",
      headers: { Accept: "application/xml,text/xml,*/*" },
      signal: AbortSignal.timeout(12_000),
    });
    const body = await response.text();
    if (!response.ok) {
      detail = `HTTP ${response.status} al solicitar el sitemap.`;
    } else if (!body.includes("<urlset") && !body.includes("<sitemapindex")) {
      detail = "La respuesta no parece un sitemap XML válido.";
    } else if (!body.includes(origin.replace(/\/$/, ""))) {
      detail = "El XML respondió, pero no contiene el dominio canónico configurado.";
      status = "warning";
    } else {
      status = "ok";
      detail = `Sitemap accesible (${body.length} bytes). Esto no confirma que Google lo haya aceptado.`;
    }
  } catch {
    detail = "No se pudo consultar el sitemap desde el servidor.";
  }

  await db
    .insert(googleIntegrationSettings)
    .values({
      businessId: 1,
      lastSitemapCheckAt: new Date(),
      lastSitemapStatus: status,
      lastSitemapDetail: detail.slice(0, 500),
      updatedAt: new Date(),
      updatedBy: user.email,
    })
    .onConflictDoUpdate({
      target: googleIntegrationSettings.businessId,
      set: {
        lastSitemapCheckAt: new Date(),
        lastSitemapStatus: status,
        lastSitemapDetail: detail.slice(0, 500),
        updatedAt: new Date(),
        updatedBy: user.email,
      },
    });

  revalidatePath("/admin/integraciones/google");
  await recordAudit(user.email, "diagnostico-sitemap", "google");
  if (status === "ok") return { error: "", ok: detail };
  if (status === "warning") return { error: "", ok: detail };
  return { error: detail, ok: "" };
}

export async function savePrivacySettingsAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const user = await requirePermission("integrations", "write");
  const db = getDb();
  if (!db) return { error: "No hay base de datos.", ok: "" };

  const noticeEnabled = checked(formData, "noticeEnabled");
  const policyVersion = text(formData, "policyVersion").slice(0, 40) || "1.0";
  const consentExpirationDays = Number(text(formData, "consentExpirationDays") || "180");
  const noticeTitle = text(formData, "noticeTitle").slice(0, 120) || "Tu privacidad importa";
  const noticeDescription = text(formData, "noticeDescription").slice(0, 600);
  const policyPath = text(formData, "policyPath") || "/politicas/privacidad";

  if (!Number.isInteger(consentExpirationDays) || consentExpirationDays < 1 || consentExpirationDays > 730) {
    return { error: "La vigencia debe ser un número entero entre 1 y 730 días.", ok: "" };
  }
  if (!policyPath.startsWith("/") || policyPath.includes("?") || policyPath.includes("//")) {
    return { error: "La ruta de la política debe empezar por / y no incluir consulta.", ok: "" };
  }
  if (!noticeDescription.trim()) {
    return { error: "Escribe la descripción del aviso.", ok: "" };
  }

  await db
    .insert(privacyConsentSettings)
    .values({
      businessId: 1,
      noticeEnabled,
      policyVersion,
      consentExpirationDays,
      noticeTitle,
      noticeDescription,
      policyPath,
      updatedAt: new Date(),
      updatedBy: user.email,
    })
    .onConflictDoUpdate({
      target: privacyConsentSettings.businessId,
      set: {
        noticeEnabled,
        policyVersion,
        consentExpirationDays,
        noticeTitle,
        noticeDescription,
        policyPath,
        updatedAt: new Date(),
        updatedBy: user.email,
      },
    });

  revalidatePath("/", "layout");
  revalidatePath("/admin/integraciones/privacidad");
  await recordAudit(user.email, "guardo-privacidad-cookies", "privacy");
  return { error: "", ok: "La configuración de privacidad quedó guardada." };
}
