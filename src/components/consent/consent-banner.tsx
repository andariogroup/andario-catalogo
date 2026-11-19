"use client";

import Link from "next/link";
import { useConsent } from "@/components/consent/consent-provider";

export function ConsentBanner({
  title,
  description,
  policyPath,
}: {
  title: string;
  description: string;
  policyPath: string;
}) {
  const { ready, needsDecision, preferencesOpen, acceptAll, rejectOptional, openPreferences, closePreferences, saveAnalytics, choice } =
    useConsent();

  if (!ready) return null;
  if (!needsDecision && !preferencesOpen) return null;

  if (preferencesOpen) {
    return (
      <div className="consent-banner" role="dialog" aria-modal="true" aria-labelledby="consent-prefs-title">
        <div className="consent-inner">
          <div className="consent-copy">
            <h2 id="consent-prefs-title">Preferencias de cookies</h2>
            <p>Las necesarias permiten el funcionamiento básico. Las analíticas son opcionales.</p>
            <fieldset className="consent-cats">
              <label className="field check">
                <input type="checkbox" checked disabled />
                Necesarias (siempre activas)
              </label>
              <label className="field check">
                <input
                  type="checkbox"
                  defaultChecked={Boolean(choice?.analytics)}
                  id="consent-analytics"
                />
                Analíticas (Google Analytics vía Tag Manager)
              </label>
            </fieldset>
          </div>
          <div className="consent-actions">
            <button
              type="button"
              className="btn"
              onClick={() => {
                const input = document.getElementById("consent-analytics") as HTMLInputElement | null;
                saveAnalytics(Boolean(input?.checked));
              }}
            >
              Guardar
            </button>
            <button type="button" className="quiet" onClick={closePreferences}>
              Cerrar
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="consent-banner" role="dialog" aria-live="polite" aria-labelledby="consent-title">
      <div className="consent-inner">
        <div className="consent-copy">
          <h2 id="consent-title">{title}</h2>
          <p>{description}</p>
          <p>
            <Link href={policyPath}>Política de privacidad</Link>
          </p>
        </div>
        <div className="consent-actions">
          <button type="button" className="btn" onClick={acceptAll}>
            Aceptar todas
          </button>
          <button type="button" className="quiet" onClick={rejectOptional}>
            Rechazar opcionales
          </button>
          <button type="button" className="quiet" onClick={openPreferences}>
            Personalizar preferencias
          </button>
        </div>
      </div>
    </div>
  );
}

export function CookiePreferencesLink() {
  const { openPreferences } = useConsent();
  return (
    <button type="button" className="footer-cookie-link" onClick={openPreferences}>
      Preferencias de cookies
    </button>
  );
}
