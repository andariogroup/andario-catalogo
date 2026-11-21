export const CONSENT_STORAGE_KEY = "andario_cookie_consent_v1";

/** Textos recomendados del aviso (Andario; no hardcodear marca de tienda). */
export const CONSENT_NOTICE_TITLE = "Uso de cookies";
export const CONSENT_NOTICE_DESCRIPTION =
  "Utilizamos cookies necesarias para el funcionamiento de la tienda y, con tu autorización, cookies analíticas para conocer cómo se utiliza y mejorarla.";

const LEGACY_NOTICE_TITLES = new Set([
  "Tu privacidad importa",
  "Tu privacidad, tú decides.",
  "Tu privacidad, tú decides",
]);

const LEGACY_NOTICE_DESCRIPTIONS = new Set([
  "Usamos tecnologías esenciales para el funcionamiento de nuestra tienda y, con tu permiso, herramientas de análisis para mejorar tu experiencia. Tú decides.",
  "Usamos tecnologías esenciales para el funcionamiento de nuestra tienda y, con tu permiso, herramientas de análisis para mejorar tu experiencia. Tú decides",
]);

/**
 * Sustituye solo textos de stock antiguos por el copy recomendado.
 * Textos personalizados desde admin se respetan sin cambios.
 */
export function resolveConsentNoticeCopy(title: string, description: string) {
  const cleanTitle = title.trim();
  const cleanDescription = description.trim();
  return {
    title: !cleanTitle || LEGACY_NOTICE_TITLES.has(cleanTitle) ? CONSENT_NOTICE_TITLE : cleanTitle,
    description:
      !cleanDescription || LEGACY_NOTICE_DESCRIPTIONS.has(cleanDescription)
        ? CONSENT_NOTICE_DESCRIPTION
        : cleanDescription,
  };
}

export type ConsentChoice = {
  analytics: boolean;
  decidedAt: string;
  policyVersion: string;
  expiresAt: string;
};

export type ConsentCategory = "necessary" | "analytics";

export function defaultDeniedConsent(policyVersion: string, expirationDays: number): ConsentChoice {
  const days = Number.isFinite(expirationDays) && expirationDays > 0 ? expirationDays : 180;
  const now = new Date();
  const expires = new Date(now.getTime() + days * 24 * 60 * 60 * 1000);
  return {
    analytics: false,
    decidedAt: now.toISOString(),
    policyVersion: policyVersion.trim() || "1.0",
    expiresAt: expires.toISOString(),
  };
}

export function consentIsExpired(choice: ConsentChoice, now = new Date()) {
  const expires = Date.parse(choice.expiresAt);
  if (!Number.isFinite(expires)) return true;
  return expires <= now.getTime();
}

export function consentNeedsRenewal(choice: ConsentChoice | null, policyVersion: string, now = new Date()) {
  if (!choice) return true;
  if (consentIsExpired(choice, now)) return true;
  if ((choice.policyVersion || "").trim() !== (policyVersion || "").trim()) return true;
  return false;
}

/** Estado de decisión para UI (no confundir rechazo con no decidido). */
export type ConsentDecisionStatus = "loading" | "undecided" | "accepted" | "rejected";

export function consentDecisionStatus(
  ready: boolean,
  choice: ConsentChoice | null,
  policyVersion: string,
  now = new Date(),
): ConsentDecisionStatus {
  if (!ready) return "loading";
  if (consentNeedsRenewal(choice, policyVersion, now)) return "undecided";
  return choice?.analytics ? "accepted" : "rejected";
}

/**
 * El aviso automático depende de noticeEnabled + falta de decisión vigente.
 * No depende de VERCEL_ENV, GTM ni trackingEnabled (la medición sigue gateada aparte).
 */
export function consentNoticeNeeded(input: {
  ready: boolean;
  noticeEnabled: boolean;
  choice: ConsentChoice | null;
  policyVersion: string;
  now?: Date;
}) {
  if (!input.ready || !input.noticeEnabled) return false;
  return consentNeedsRenewal(input.choice, input.policyVersion, input.now);
}

/** Sí analítico vigente. Una versión distinta o una fecha vencida no concede medición. */
export function storedAnalyticsGranted(raw: string | null, policyVersion: string, now = new Date()) {
  const choice = parseConsentJson(raw);
  if (!choice || consentNeedsRenewal(choice, policyVersion, now)) return false;
  return choice.analytics;
}

/**
 * Consent Mode v2 antes de hidratar. Lee la misma preferencia que el aviso.
 * No carga Tag Manager. Publicidad queda denegada.
 */
export function consentDefaultBootstrapSource(policyVersion: string) {
  const policy = JSON.stringify((policyVersion || "").trim() || "1.0");
  const key = JSON.stringify(CONSENT_STORAGE_KEY);
  return [
    "window.dataLayer = window.dataLayer || [];",
    "window.gtag = window.gtag || function gtag(){window.dataLayer.push(arguments);};",
    "(function(){",
    "var granted = false;",
    "try {",
    `var raw = localStorage.getItem(${key});`,
    "var data = raw ? JSON.parse(raw) : null;",
    "var expires = data && Date.parse(data.expiresAt);",
    `granted = !!(data && data.analytics === true && typeof data.policyVersion === "string" && data.policyVersion.trim() === ${policy} && Number.isFinite(expires) && expires > Date.now());`,
    "} catch (e) {}",
    "window.gtag('consent', 'default', {",
    "analytics_storage: granted ? 'granted' : 'denied',",
    "ad_storage: 'denied',",
    "ad_user_data: 'denied',",
    "ad_personalization: 'denied',",
    "personalization_storage: 'denied',",
    "functionality_storage: 'granted',",
    "security_storage: 'granted'",
    "});",
    "})();",
  ].join("\n");
}

export function parseConsentJson(raw: string | null): ConsentChoice | null {
  if (!raw) return null;
  try {
    const data = JSON.parse(raw) as Partial<ConsentChoice>;
    if (typeof data.analytics !== "boolean") return null;
    if (typeof data.decidedAt !== "string" || typeof data.expiresAt !== "string") return null;
    if (typeof data.policyVersion !== "string") return null;
    return {
      analytics: data.analytics,
      decidedAt: data.decidedAt,
      policyVersion: data.policyVersion,
      expiresAt: data.expiresAt,
    };
  } catch {
    return null;
  }
}
