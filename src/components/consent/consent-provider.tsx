"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import {
  CONSENT_STORAGE_KEY,
  consentDecisionStatus,
  consentNeedsRenewal,
  consentNoticeNeeded,
  defaultDeniedConsent,
  parseConsentJson,
  type ConsentChoice,
  type ConsentDecisionStatus,
} from "@/lib/consent";
import { configureAnalyticsRuntime, trackPageView, updateConsentMode } from "@/lib/analytics";

type ConsentContextValue = {
  ready: boolean;
  choice: ConsentChoice | null;
  status: ConsentDecisionStatus;
  needsDecision: boolean;
  preferencesOpen: boolean;
  openPreferences: () => void;
  closePreferences: () => void;
  acceptAll: () => void;
  rejectOptional: () => void;
  saveAnalytics: (analytics: boolean) => void;
  analyticsAllowed: boolean;
};

const ConsentContext = createContext<ConsentContextValue | null>(null);

const emptySubscribe = () => () => {};

function subscribeConsent(onStoreChange: () => void) {
  if (typeof window === "undefined") return () => {};
  const onStorage = (event: StorageEvent) => {
    if (event.key === CONSENT_STORAGE_KEY || event.key === null) onStoreChange();
  };
  window.addEventListener("storage", onStorage);
  return () => window.removeEventListener("storage", onStorage);
}

function readConsentSnapshot() {
  try {
    return localStorage.getItem(CONSENT_STORAGE_KEY) ?? "";
  } catch {
    return "";
  }
}

function writeConsent(next: ConsentChoice, expirationDays: number) {
  try {
    localStorage.setItem(CONSENT_STORAGE_KEY, JSON.stringify(next));
  } catch {
    /* ignore */
  }
  try {
    document.cookie = `andario_consent_analytics=${next.analytics ? "1" : "0"}; path=/; max-age=${Math.max(1, expirationDays) * 86400}; samesite=lax`;
  } catch {
    /* ignore */
  }
  window.dispatchEvent(new StorageEvent("storage", { key: CONSENT_STORAGE_KEY, newValue: JSON.stringify(next) }));
}

export function ConsentProvider({
  children,
  noticeEnabled,
  policyVersion,
  expirationDays,
  measurementConfigured,
  commerceEventsEnabled,
  gtmContainerId,
}: {
  children: ReactNode;
  noticeEnabled: boolean;
  policyVersion: string;
  expirationDays: number;
  measurementConfigured: boolean;
  commerceEventsEnabled: boolean;
  gtmContainerId: string;
}) {
  // false en SSR/hidratación; true después → sin mismatch
  const hydrated = useSyncExternalStore(emptySubscribe, () => true, () => false);
  const rawStored = useSyncExternalStore(subscribeConsent, readConsentSnapshot, () => "");
  const raw = hydrated ? rawStored : "";
  const stored = parseConsentJson(raw || null);
  const choice = stored && !consentNeedsRenewal(stored, policyVersion) ? stored : null;
  const ready = hydrated;
  const [preferencesOpen, setPreferencesOpen] = useState(false);

  useEffect(() => {
    if (!ready) return;
    configureAnalyticsRuntime({
      ready: measurementConfigured,
      consentAnalytics: Boolean(choice?.analytics),
      commerceEvents: commerceEventsEnabled,
    });
    updateConsentMode(Boolean(choice?.analytics));
  }, [choice?.analytics, commerceEventsEnabled, measurementConfigured, ready]);

  const persist = useCallback(
    (next: ConsentChoice) => {
      writeConsent(next, expirationDays);
      updateConsentMode(next.analytics);
      configureAnalyticsRuntime({
        ready: measurementConfigured,
        consentAnalytics: next.analytics,
        commerceEvents: commerceEventsEnabled,
      });
      if (next.analytics && measurementConfigured) {
        trackPageView(window.location.pathname + window.location.search);
      }
    },
    [commerceEventsEnabled, expirationDays, measurementConfigured],
  );

  // Aviso automático: noticeEnabled + sin decisión vigente. GTM sigue gateado por measurementConfigured.
  const needsDecision = consentNoticeNeeded({
    ready,
    noticeEnabled,
    choice,
    policyVersion,
  });
  const status = consentDecisionStatus(ready, choice, policyVersion);

  const value: ConsentContextValue = {
    ready,
    choice,
    status,
    needsDecision,
    preferencesOpen,
    openPreferences: () => setPreferencesOpen(true),
    closePreferences: () => setPreferencesOpen(false),
    acceptAll: () => {
      persist({ ...defaultDeniedConsent(policyVersion, expirationDays), analytics: true });
      setPreferencesOpen(false);
    },
    rejectOptional: () => {
      persist(defaultDeniedConsent(policyVersion, expirationDays));
      setPreferencesOpen(false);
      if (window.__andarioGtmLoaded) window.location.reload();
    },
    saveAnalytics: (analytics: boolean) => {
      const was = Boolean(choice?.analytics);
      persist({ ...defaultDeniedConsent(policyVersion, expirationDays), analytics });
      setPreferencesOpen(false);
      if (was && !analytics && window.__andarioGtmLoaded) window.location.reload();
    },
    analyticsAllowed: Boolean(choice?.analytics),
  };

  return (
    <ConsentContext.Provider value={value}>
      {children}
      {gtmContainerId ? (
        <span hidden data-gtm={gtmContainerId} data-measurement={measurementConfigured ? "1" : "0"} />
      ) : null}
    </ConsentContext.Provider>
  );
}

export function useConsent() {
  const ctx = useContext(ConsentContext);
  if (!ctx) throw new Error("useConsent requiere ConsentProvider");
  return ctx;
}

declare global {
  interface Window {
    __andarioGtmLoaded?: boolean;
  }
}
