import { describe, expect, it } from "vitest";
import {
  applyConsentUpdate,
  configureAnalyticsRuntime,
  googleConsentState,
  trackPageView,
  trackPurchase,
} from "@/lib/analytics";
import {
  CONSENT_NOTICE_DESCRIPTION,
  CONSENT_NOTICE_TITLE,
  consentDecisionStatus,
  consentDefaultBootstrapSource,
  consentIsExpired,
  consentNeedsRenewal,
  consentNoticeNeeded,
  defaultDeniedConsent,
  parseConsentJson,
  resolveConsentNoticeCopy,
  storedAnalyticsGranted,
} from "@/lib/consent";
import {
  apexHostFromOrigin,
  ga4IdProblem,
  ga4PropertyIdProblem,
  gtmIdProblem,
  isGoogleMeasurementEnv,
  normalizeGa4Id,
  normalizeGtmId,
  searchConsolePropertyFromOrigin,
} from "@/lib/google-ids";
import { allows } from "@/lib/permissions";

describe("google ids", () => {
  it("valida formatos GA4 y GTM", () => {
    expect(ga4IdProblem("")).toBe("");
    expect(ga4IdProblem("G-ABC12345")).toBe("");
    expect(ga4IdProblem("UA-123")).toMatch(/G-/);
    expect(gtmIdProblem("GTM-AAAA")).toBe("");
    expect(gtmIdProblem("gtm-bbbb")).toBe("");
    expect(normalizeGtmId("gtm-bbbb")).toBe("GTM-BBBB");
    expect(normalizeGa4Id("g-xyz98765")).toBe("G-XYZ98765");
    expect(ga4PropertyIdProblem("123456789")).toBe("");
    expect(ga4PropertyIdProblem("abc")).toMatch(/dígitos/);
  });

  it("deriva propiedad Search Console desde el origen", () => {
    expect(apexHostFromOrigin("https://www.trinitarias.co")).toBe("trinitarias.co");
    expect(searchConsolePropertyFromOrigin("https://www.trinitarias.co")).toBe("sc-domain:trinitarias.co");
    expect(searchConsolePropertyFromOrigin("http://localhost:3020")).toBe("");
  });

  it("no considera producción si VERCEL_ENV no es production", () => {
    const previous = process.env.VERCEL_ENV;
    process.env.VERCEL_ENV = "preview";
    expect(isGoogleMeasurementEnv()).toBe(false);
    process.env.VERCEL_ENV = "production";
    expect(isGoogleMeasurementEnv()).toBe(true);
    process.env.VERCEL_ENV = previous;
  });
});

describe("consent persistence", () => {
  it("parsea, caduca y renueva por versión de política", () => {
    const choice = defaultDeniedConsent("1.0", 180);
    expect(choice.analytics).toBe(false);
    expect(consentIsExpired(choice)).toBe(false);
    expect(consentNeedsRenewal(choice, "1.0")).toBe(false);
    expect(consentNeedsRenewal(choice, "2.0")).toBe(true);
    expect(parseConsentJson(JSON.stringify(choice))).toEqual(choice);
    expect(parseConsentJson("{bad")).toBeNull();
    expect(consentIsExpired({ ...choice, expiresAt: "2000-01-01T00:00:00.000Z" })).toBe(true);
  });

  it("distingue loading / undecided / accepted / rejected sin confundir rechazo con no decidido", () => {
    const rejected = defaultDeniedConsent("1.0", 180);
    const accepted = { ...rejected, analytics: true };
    expect(consentDecisionStatus(false, null, "1.0")).toBe("loading");
    expect(consentDecisionStatus(true, null, "1.0")).toBe("undecided");
    expect(consentDecisionStatus(true, rejected, "1.0")).toBe("rejected");
    expect(consentDecisionStatus(true, accepted, "1.0")).toBe("accepted");
    expect(consentDecisionStatus(true, rejected, "2.0")).toBe("undecided");
  });

  it("muestra el aviso automático con noticeEnabled aunque la medición Google esté apagada", () => {
    expect(
      consentNoticeNeeded({ ready: true, noticeEnabled: true, choice: null, policyVersion: "1.0" }),
    ).toBe(true);
    expect(
      consentNoticeNeeded({ ready: true, noticeEnabled: false, choice: null, policyVersion: "1.0" }),
    ).toBe(false);
    const rejected = defaultDeniedConsent("1.0", 180);
    expect(
      consentNoticeNeeded({ ready: true, noticeEnabled: true, choice: rejected, policyVersion: "1.0" }),
    ).toBe(false);
    expect(
      consentNoticeNeeded({ ready: true, noticeEnabled: true, choice: rejected, policyVersion: "1.1" }),
    ).toBe(true);
    expect(
      consentNoticeNeeded({
        ready: true,
        noticeEnabled: true,
        choice: { ...rejected, expiresAt: "2000-01-01T00:00:00.000Z" },
        policyVersion: "1.0",
      }),
    ).toBe(true);
  });

  it("migra solo textos de stock antiguos al copy compacto y respeta personalizaciones", () => {
    expect(CONSENT_NOTICE_TITLE).toBe("Uso de cookies");
    expect(CONSENT_NOTICE_DESCRIPTION).toMatch(/cookies necesarias/);
    expect(CONSENT_NOTICE_DESCRIPTION).not.toMatch(/Tú decides|Tu privacidad importa/i);
    expect(
      resolveConsentNoticeCopy(
        "Tu privacidad importa",
        "Usamos tecnologías esenciales para el funcionamiento de nuestra tienda y, con tu permiso, herramientas de análisis para mejorar tu experiencia. Tú decides.",
      ),
    ).toEqual({ title: CONSENT_NOTICE_TITLE, description: CONSENT_NOTICE_DESCRIPTION });
    expect(resolveConsentNoticeCopy("Aviso propio", "Texto legal personalizado de la tienda.")).toEqual({
      title: "Aviso propio",
      description: "Texto legal personalizado de la tienda.",
    });
  });
});

function consentFromBootstrap(source: string, stored: string | null, now: number) {
  const dataLayer: unknown[] = [];
  const sandbox = { dataLayer } as { dataLayer: unknown[]; gtag?: (...args: unknown[]) => void };
  const previous = Date.now;
  Date.now = () => now;
  try {
    const run = new Function("window", "localStorage", source) as (
      window: { dataLayer: unknown[] },
      storage: { getItem: () => string | null },
    ) => void;
    run(sandbox, { getItem: () => stored });
  } finally {
    Date.now = previous;
  }
  const command = dataLayer[0] as { 0: string; 1: string; 2: Record<string, string> };
  return { name: command[1], state: command[2], length: dataLayer.length };
}

describe("consent mode", () => {
  const now = Date.parse("2026-06-01T00:00:00.000Z");
  const future = "2027-01-01T00:00:00.000Z";
  const source = consentDefaultBootstrapSource("1.0");

  function stored(analytics: boolean, policyVersion = "1.0", expiresAt = future) {
    return JSON.stringify({
      analytics,
      decidedAt: "2026-01-01T00:00:00.000Z",
      policyVersion,
      expiresAt,
    });
  }

  it("niega analítica y publicidad si no hay un sí vigente", () => {
    expect(source).not.toContain("gtm.js");
    expect(source).not.toContain("andario_consent_update");
    for (const raw of [null, stored(false), stored(true, "2.0"), stored(true, "1.0", "2000-01-01T00:00:00.000Z"), "{bad"]) {
      expect(storedAnalyticsGranted(raw, "1.0", new Date(now))).toBe(false);
      const command = consentFromBootstrap(source, raw, now);
      expect(command.name).toBe("default");
      expect(command.state.analytics_storage).toBe("denied");
      expect(command.state.ad_storage).toBe("denied");
      expect(command.state.ad_user_data).toBe("denied");
      expect(command.state.ad_personalization).toBe("denied");
      expect(command.length).toBe(1);
    }
  });

  it("concede solo la analítica cuando el sí sigue vigente", () => {
    const raw = stored(true);
    expect(storedAnalyticsGranted(raw, "1.0", new Date(now))).toBe(true);
    const command = consentFromBootstrap(source, raw, now);
    expect(command.state.analytics_storage).toBe("granted");
    expect(command.state.ad_storage).toBe("denied");
    expect(command.state.functionality_storage).toBe("granted");
    expect(command.state.security_storage).toBe("granted");
    expect(googleConsentState(true).personalization_storage).toBe("denied");
    expect(googleConsentState(false).analytics_storage).toBe("denied");
  });

  it("actualiza el consentimiento sin inventar un evento y reintenta page_view una sola vez", () => {
    const dataLayer: unknown[] = [];
    const previousWindow = globalThis.window;
    const previousDocument = globalThis.document;
    Object.assign(globalThis, {
      window: { dataLayer, location: { href: "https://www.trinitarias.co/" } },
      document: { title: "Tienda" },
    });
    try {
      applyConsentUpdate(true);
      const update = dataLayer[0] as { 0: string; 1: string; 2: { analytics_storage: string; ad_storage: string } };
      expect(update[0]).toBe("consent");
      expect(update[1]).toBe("update");
      expect(update[2].analytics_storage).toBe("granted");
      expect(update[2].ad_storage).toBe("denied");
      expect(dataLayer.some((item) => typeof item === "object" && item !== null && "event" in item)).toBe(false);
      expect(trackPageView("/")).toBe(false);
      configureAnalyticsRuntime({ ready: true, consentAnalytics: true, commerceEvents: true });
      expect(trackPageView("/")).toBe(true);
      expect(trackPageView("/")).toBe(false);
      expect(dataLayer.filter((item) => typeof item === "object" && item !== null && "event" in item)).toHaveLength(1);
      expect(trackPurchase({ transaction_id: "x", currency: "COP", value: 1, items: [] })).toBe(false);
    } finally {
      Object.assign(globalThis, { window: previousWindow, document: previousDocument });
    }
  });
});

describe("integrations permissions", () => {
  it("abre integraciones a admin y marketing", () => {
    expect(allows("admin", "integrations", "manage")).toBe(true);
    expect(allows("marketing", "integrations", "write")).toBe(true);
    expect(allows("catalog", "integrations", "read")).toBe(false);
    expect(allows("commercial", "integrations", "read")).toBe(false);
  });
});
