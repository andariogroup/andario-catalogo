export const CONSENT_STORAGE_KEY = "andario_cookie_consent_v1";

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
