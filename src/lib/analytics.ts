/**
 * Adaptador centralizado de medición comercial → dataLayer.
 * No carga GTM. No envía PII. Respeta consentimiento y entorno.
 */

export type AnalyticsItem = {
  item_id: string;
  item_name: string;
  item_category?: string;
  item_variant?: string;
  price?: number;
  quantity?: number;
};

export type CommerceEventName =
  | "page_view"
  | "view_item_list"
  | "select_item"
  | "view_item"
  | "add_to_cart"
  | "remove_from_cart"
  | "view_cart"
  | "contact_whatsapp"
  | "purchase";

type PushPayload = Record<string, unknown>;

export type GoogleConsentState = {
  analytics_storage: "granted" | "denied";
  ad_storage: "denied";
  ad_user_data: "denied";
  ad_personalization: "denied";
  personalization_storage: "denied";
  functionality_storage: "granted";
  security_storage: "granted";
};

/** Matriz de Consent Mode v2. La publicidad no se concede. */
export function googleConsentState(analyticsGranted: boolean): GoogleConsentState {
  return {
    analytics_storage: analyticsGranted ? "granted" : "denied",
    ad_storage: "denied",
    ad_user_data: "denied",
    ad_personalization: "denied",
    personalization_storage: "denied",
    functionality_storage: "granted",
    security_storage: "granted",
  };
}

declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: (...args: unknown[]) => void;
    __andarioAnalyticsReady?: boolean;
    __andarioConsentAnalytics?: boolean;
    __andarioCommerceEvents?: boolean;
    __andarioPageViewKey?: string;
  }
}

function canEmit() {
  if (typeof window === "undefined") return false;
  if (!window.__andarioAnalyticsReady) return false;
  if (!window.__andarioConsentAnalytics) return false;
  return true;
}

function push(event: string, payload: PushPayload = {}) {
  if (!canEmit()) return false;
  try {
    window.dataLayer = window.dataLayer || [];
    window.dataLayer.push({ event, ...payload });
    return true;
  } catch {
    return false;
  }
}

export function configureAnalyticsRuntime(input: {
  ready: boolean;
  consentAnalytics: boolean;
  commerceEvents: boolean;
}) {
  if (typeof window === "undefined") return;
  window.__andarioAnalyticsReady = input.ready;
  window.__andarioConsentAnalytics = input.consentAnalytics;
  window.__andarioCommerceEvents = input.commerceEvents;
}

export function trackPageView(path: string) {
  const clean = path.trim() || "/";
  if (typeof window === "undefined") return false;
  if (window.__andarioPageViewKey === clean) return false;
  const pageTitle = typeof document === "undefined" ? "" : document.title;
  const sent = push("page_view", { page_path: clean, page_location: window.location.href, page_title: pageTitle });
  if (sent) window.__andarioPageViewKey = clean;
  return sent;
}

export function trackViewItemList(input: { item_list_id?: string; item_list_name?: string; items: AnalyticsItem[] }) {
  if (typeof window !== "undefined" && window.__andarioCommerceEvents === false) return false;
  return push("view_item_list", {
    item_list_id: input.item_list_id || "",
    item_list_name: input.item_list_name || "",
    items: input.items,
  });
}

export function trackSelectItem(input: { item_list_id?: string; item_list_name?: string; items: AnalyticsItem[] }) {
  if (typeof window !== "undefined" && window.__andarioCommerceEvents === false) return false;
  return push("select_item", {
    item_list_id: input.item_list_id || "",
    item_list_name: input.item_list_name || "",
    items: input.items,
  });
}

export function trackViewItem(input: { currency: string; value: number | null; items: AnalyticsItem[] }) {
  if (typeof window !== "undefined" && window.__andarioCommerceEvents === false) return false;
  return push("view_item", {
    currency: input.currency || "COP",
    value: input.value ?? undefined,
    items: input.items,
  });
}

export function trackAddToCart(input: { currency: string; value: number | null; items: AnalyticsItem[] }) {
  if (typeof window !== "undefined" && window.__andarioCommerceEvents === false) return false;
  return push("add_to_cart", {
    currency: input.currency || "COP",
    value: input.value ?? undefined,
    items: input.items,
  });
}

export function trackRemoveFromCart(input: { currency: string; value: number | null; items: AnalyticsItem[] }) {
  if (typeof window !== "undefined" && window.__andarioCommerceEvents === false) return false;
  return push("remove_from_cart", {
    currency: input.currency || "COP",
    value: input.value ?? undefined,
    items: input.items,
  });
}

export function trackViewCart(input: { currency: string; value: number | null; items: AnalyticsItem[] }) {
  if (typeof window !== "undefined" && window.__andarioCommerceEvents === false) return false;
  return push("view_cart", {
    currency: input.currency || "COP",
    value: input.value ?? undefined,
    items: input.items,
  });
}

export function trackContactWhatsapp(input: { source: string; item_id?: string; item_name?: string }) {
  return push("contact_whatsapp", {
    source: input.source,
    item_id: input.item_id || undefined,
    item_name: input.item_name || undefined,
  });
}

/** Preparado; no usar hasta existir confirmación comercial real. */
export function trackPurchase(_args: {
  transaction_id: string;
  currency: string;
  value: number;
  items: AnalyticsItem[];
}): false {
  void _args;
  return false;
}

function ensureGtag() {
  window.dataLayer = window.dataLayer || [];
  if (typeof window.gtag !== "function") {
    window.gtag = function gtag() {
      // Consent Mode lee este objeto arguments. Un arreglo rest no activa el estado predeterminado.
      // eslint-disable-next-line prefer-rest-params
      window.dataLayer?.push(arguments);
    };
  }
}

/** Actualiza Consent Mode. No crea un evento de catálogo. */
export function applyConsentUpdate(analyticsGranted: boolean) {
  if (typeof window === "undefined") return;
  try {
    ensureGtag();
    window.gtag?.("consent", "update", googleConsentState(analyticsGranted));
  } catch {
    /* ignore */
  }
}
