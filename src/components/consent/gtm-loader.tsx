"use client";

import { useEffect } from "react";
import Script from "next/script";
import { useConsent } from "@/components/consent/consent-provider";
import { gtmIdProblem, normalizeGtmId } from "@/lib/google-ids";
import { trackPageView } from "@/lib/analytics";

/**
 * Tag Manager se inyecta solo tras el sí analítico, en producción y con ID válido.
 * El comando consent default ya corrió en el layout, antes de esta carga.
 */
export function GtmLoader({ containerId, measurementConfigured }: { containerId: string; measurementConfigured: boolean }) {
  const { analyticsAllowed, ready } = useConsent();
  const id = normalizeGtmId(containerId);
  const valid = id && !gtmIdProblem(id);
  const shouldLoad = Boolean(ready && measurementConfigured && analyticsAllowed && valid);

  useEffect(() => {
    if (!shouldLoad) return;
    trackPageView(window.location.pathname + window.location.search);
  }, [shouldLoad]);

  useEffect(() => {
    if (!shouldLoad) return;
    function onPath() {
      trackPageView(window.location.pathname + window.location.search);
    }
    window.addEventListener("popstate", onPath);
    return () => window.removeEventListener("popstate", onPath);
  }, [shouldLoad]);

  if (!shouldLoad || !id) return null;

  return (
    <>
      <Script id="andario-gtm-boot" strategy="afterInteractive">{`
        window.dataLayer = window.dataLayer || [];
        window.dataLayer.push({'gtm.start': new Date().getTime(), event: 'gtm.js'});
        window.__andarioGtmLoaded = true;
      `}</Script>
      <Script
        id="andario-gtm"
        strategy="afterInteractive"
        src={`https://www.googletagmanager.com/gtm.js?id=${encodeURIComponent(id)}`}
      />
    </>
  );
}

export function AnalyticsPathWatcher() {
  const { analyticsAllowed, ready } = useConsent();
  useEffect(() => {
    if (!ready || !analyticsAllowed) return;
    const originalPush = history.pushState;
    const originalReplace = history.replaceState;
    function notify() {
      trackPageView(window.location.pathname + window.location.search);
    }
    history.pushState = function (...args) {
      const result = originalPush.apply(this, args as Parameters<History["pushState"]>);
      notify();
      return result;
    };
    history.replaceState = function (...args) {
      const result = originalReplace.apply(this, args as Parameters<History["replaceState"]>);
      notify();
      return result;
    };
    return () => {
      history.pushState = originalPush;
      history.replaceState = originalReplace;
    };
  }, [analyticsAllowed, ready]);
  return null;
}
