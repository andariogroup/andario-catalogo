"use client";

import Link from "next/link";
import { useConsent } from "@/components/consent/consent-provider";
import { resolveConsentNoticeCopy } from "@/lib/consent";

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
  const copy = resolveConsentNoticeCopy(title, description);

  if (!ready) return null;
  if (!needsDecision && !preferencesOpen) return null;

  if (preferencesOpen) {
    return (
      <div className="consent-banner is-prefs" role="dialog" aria-modal="true" aria-labelledby="consent-prefs-title">
        <div className="consent-inner">
          <div className="consent-copy">
            <h2 id="consent-prefs-title">Preferencias de cookies</h2>
            <p>Las necesarias permiten el funcionamiento de la tienda. Las analíticas son opcionales.</p>
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
                Analíticas (opcionales)
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
    <div className="consent-banner" role="region" aria-live="polite" aria-labelledby="consent-title">
      <div className="consent-inner">
        <div className="consent-copy">
          <h2 id="consent-title">{copy.title}</h2>
          <p>
            {copy.description}{" "}
            <Link href={policyPath} className="consent-policy">
              Política de privacidad
            </Link>
          </p>
        </div>
        <div className="consent-actions">
          <button type="button" className="btn" onClick={acceptAll}>
            Aceptar todas
          </button>
          <button type="button" className="quiet" onClick={rejectOptional}>
            Solo necesarias
          </button>
          <button type="button" className="quiet" onClick={openPreferences}>
            Configurar
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
