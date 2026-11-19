"use client";

import { useState } from "react";
import { savePrivacySettingsAction } from "@/actions/integrations";
import { BoundForm } from "@/components/admin/form";
import {
  CONSENT_NOTICE_DESCRIPTION,
  CONSENT_NOTICE_TITLE,
  resolveConsentNoticeCopy,
} from "@/lib/consent";

export type PrivacyDraft = {
  noticeEnabled: boolean;
  policyVersion: string;
  consentExpirationDays: number;
  noticeTitle: string;
  noticeDescription: string;
  policyPath: string;
  updatedAt: string;
  updatedBy: string;
};

export function PrivacyConsentStudio({ initial, canEdit }: { initial: PrivacyDraft; canEdit: boolean }) {
  const [draft, setDraft] = useState(initial);
  const preview = resolveConsentNoticeCopy(draft.noticeTitle, draft.noticeDescription);
  const usingLegacyStock =
    preview.title !== draft.noticeTitle.trim() || preview.description !== draft.noticeDescription.trim();

  return (
    <div className="seo-layout">
      <div className="seo-main">
        <section className="seo-card">
          <header className="seo-card-head">
            <div>
              <h2>Aviso de privacidad</h2>
              <p>Textos y vigencia del consentimiento para tecnologías opcionales de análisis.</p>
            </div>
          </header>
          {canEdit ? (
            <BoundForm action={savePrivacySettingsAction} label="Guardar privacidad">
              <label className="field check">
                <input
                  name="noticeEnabled"
                  type="checkbox"
                  checked={draft.noticeEnabled}
                  onChange={(event) => setDraft((current) => ({ ...current, noticeEnabled: event.target.checked }))}
                />
                Mostrar aviso cuando haga falta consentimiento
              </label>
              <label className="field">
                Título
                <input
                  name="noticeTitle"
                  value={draft.noticeTitle}
                  maxLength={120}
                  onChange={(event) => setDraft((current) => ({ ...current, noticeTitle: event.target.value }))}
                />
              </label>
              <label className="field">
                Descripción
                <textarea
                  name="noticeDescription"
                  rows={4}
                  maxLength={600}
                  value={draft.noticeDescription}
                  onChange={(event) => setDraft((current) => ({ ...current, noticeDescription: event.target.value }))}
                />
              </label>
              <p className="hint">
                Recomendado Andario: «{CONSENT_NOTICE_TITLE}» y la descripción breve sobre cookies necesarias y analíticas.
              </p>
              <button
                type="button"
                className="quiet"
                onClick={() =>
                  setDraft((current) => ({
                    ...current,
                    noticeTitle: CONSENT_NOTICE_TITLE,
                    noticeDescription: CONSENT_NOTICE_DESCRIPTION,
                  }))
                }
              >
                Aplicar texto recomendado
              </button>
              {usingLegacyStock ? (
                <p className="hint">
                  La tienda ya muestra el texto recomendado en público (el valor guardado aún es el anterior). Guarda para
                  alinear la base de datos.
                </p>
              ) : null}
              <label className="field">
                Versión de política
                <input
                  name="policyVersion"
                  value={draft.policyVersion}
                  maxLength={40}
                  onChange={(event) => setDraft((current) => ({ ...current, policyVersion: event.target.value }))}
                />
              </label>
              <label className="field">
                Vigencia (días)
                <input
                  name="consentExpirationDays"
                  type="number"
                  min={1}
                  max={730}
                  value={draft.consentExpirationDays}
                  onChange={(event) =>
                    setDraft((current) => ({ ...current, consentExpirationDays: Number(event.target.value) || 180 }))
                  }
                />
              </label>
              <label className="field">
                Ruta de la política
                <input
                  name="policyPath"
                  value={draft.policyPath}
                  onChange={(event) => setDraft((current) => ({ ...current, policyPath: event.target.value }))}
                />
              </label>
              <p className="hint">
                Categorías: necesarias (siempre activas) y analíticas (opcionales, desactivadas hasta que la visitante acepte).
              </p>
            </BoundForm>
          ) : (
            <div className="seo-read">
              <p>
                <strong>{draft.noticeTitle}</strong>
              </p>
              <p>{draft.noticeDescription}</p>
              <p className="hint">
                Versión {draft.policyVersion} · {draft.consentExpirationDays} días · {draft.policyPath}
              </p>
            </div>
          )}
        </section>
      </div>
      <aside className="seo-side">
        <section className="seo-card" aria-label="Vista previa del aviso">
          <h2>Vista previa</h2>
          <div className="seo-snippet">
            <strong>{preview.title}</strong>
            <span>{preview.description}</span>
            <span className="hint">Aceptar todas · Solo necesarias · Configurar</span>
          </div>
          <p className="hint">
            {draft.noticeEnabled
              ? "El aviso inicial aparece en la tienda cuando falta una decisión vigente (aunque la medición Google esté apagada)."
              : "El aviso automático está desactivado."}
          </p>
          {draft.updatedAt ? (
            <p className="hint">
              Última modificación: {draft.updatedAt}
              {draft.updatedBy ? ` · ${draft.updatedBy}` : ""}
            </p>
          ) : null}
        </section>
      </aside>
    </div>
  );
}
