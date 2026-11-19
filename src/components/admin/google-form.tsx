"use client";

import { useActionState, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { diagnoseSitemapAction, saveGoogleIntegrationsAction } from "@/actions/integrations";
import { BoundForm } from "@/components/admin/form";
import { emptyForm } from "@/lib/form";
import { ga4IdProblem, gtmIdProblem } from "@/lib/google-ids";

export type GoogleDraft = {
  searchConsoleProperty: string;
  ga4MeasurementId: string;
  ga4PropertyId: string;
  gtmContainerId: string;
  trackingEnabled: boolean;
  commerceEventsEnabled: boolean;
  lastSitemapCheckAt: string;
  lastSitemapStatus: string;
  lastSitemapDetail: string;
  updatedAt: string;
  updatedBy: string;
};

export function GoogleIntegrationsStudio({
  initial,
  origin,
  apexHost,
  sitemapUrl,
  envLabel,
  canEdit,
}: {
  initial: GoogleDraft;
  origin: string;
  apexHost: string;
  sitemapUrl: string;
  envLabel: string;
  canEdit: boolean;
}) {
  const [draft, setDraft] = useState(initial);
  const ga4Problem = ga4IdProblem(draft.ga4MeasurementId);
  const gtmProblem = gtmIdProblem(draft.gtmContainerId);
  const status =
    !draft.gtmContainerId && !draft.ga4MeasurementId
      ? "Sin configurar"
      : draft.trackingEnabled
        ? "Configurado"
        : "Configurado (medición apagada)";

  return (
    <div className="seo-layout">
      <div className="seo-main">
        <section className="seo-card">
          <header className="seo-card-head">
            <div>
              <h2>Estado general</h2>
              <p>Dominio público: {origin || "Sin URL pública"}. Entorno actual: {envLabel}.</p>
            </div>
            <span className="category-tag quote-state quote-state-en-gestion">{status}</span>
          </header>
          <p className="hint">
            GA4 se mide a través de GTM. Guardar el ID aquí no publica el contenedor de Google: hay que actualizarlo también en Tag Manager.
          </p>
          {draft.updatedAt ? (
            <p className="hint">
              Última modificación: {draft.updatedAt}
              {draft.updatedBy ? ` · ${draft.updatedBy}` : ""}
            </p>
          ) : null}
        </section>

        <section className="seo-card">
          <header className="seo-card-head">
            <div>
              <h2>Google Search Console</h2>
              <p>Registra el dominio y envía el sitemap. La verificación DNS la hace Google.</p>
            </div>
          </header>
          <p>
            <strong>Dominio:</strong> {apexHost || "—"}
          </p>
          <p>
            <strong>Propiedad:</strong> {draft.searchConsoleProperty || (apexHost ? `sc-domain:${apexHost}` : "—")}
          </p>
          <p>
            <strong>Sitemap:</strong>{" "}
            <a href={sitemapUrl} target="_blank" rel="noreferrer">
              {sitemapUrl}
            </a>
          </p>
          <ol className="hint" style={{ margin: 0, paddingLeft: "1.2rem" }}>
            <li>Abre Search Console y agrega la propiedad de dominio {apexHost || "del negocio"}.</li>
            <li>Copia el registro TXT que Google te muestre y publícalo en el DNS del dominio.</li>
            <li>Cuando Google confirme, envía {sitemapUrl}.</li>
          </ol>
          <p>
            <a className="btn" href="https://search.google.com/search-console" target="_blank" rel="noreferrer">
              Abrir Search Console
            </a>
          </p>
          {draft.lastSitemapDetail ? (
            <p className={draft.lastSitemapStatus === "error" ? "note-bad" : "note-ok"}>
              Diagnóstico{draft.lastSitemapCheckAt ? ` (${draft.lastSitemapCheckAt})` : ""}: {draft.lastSitemapDetail}
            </p>
          ) : (
            <p className="hint">Todavía no hay un diagnóstico del sitemap.</p>
          )}
          {canEdit ? <DiagnoseButton /> : null}
        </section>

        <section className="seo-card">
          <header className="seo-card-head">
            <div>
              <h2>Google Analytics 4 y Tag Manager</h2>
              <p>Identificadores y activación. Solo producción carga GTM, y solo con consentimiento analítico.</p>
            </div>
          </header>
          {canEdit ? (
            <BoundForm action={saveGoogleIntegrationsAction} label="Guardar integraciones">
              <label className="field">
                ID de medición GA4
                <input
                  name="ga4MeasurementId"
                  value={draft.ga4MeasurementId}
                  placeholder="G-XXXXXXXXXX"
                  onChange={(event) => setDraft((current) => ({ ...current, ga4MeasurementId: event.target.value }))}
                />
              </label>
              {ga4Problem ? <p className="note-bad">{ga4Problem}</p> : null}
              <label className="field">
                ID numérico de propiedad GA4 (opcional)
                <input
                  name="ga4PropertyId"
                  value={draft.ga4PropertyId}
                  placeholder="123456789"
                  onChange={(event) => setDraft((current) => ({ ...current, ga4PropertyId: event.target.value }))}
                />
              </label>
              <label className="field">
                ID de contenedor GTM
                <input
                  name="gtmContainerId"
                  value={draft.gtmContainerId}
                  placeholder="GTM-XXXXXXX"
                  onChange={(event) => setDraft((current) => ({ ...current, gtmContainerId: event.target.value }))}
                />
              </label>
              {gtmProblem ? <p className="note-bad">{gtmProblem}</p> : null}
              <label className="field check">
                <input
                  name="trackingEnabled"
                  type="checkbox"
                  checked={draft.trackingEnabled}
                  onChange={(event) => setDraft((current) => ({ ...current, trackingEnabled: event.target.checked }))}
                />
                Medición habilitada en producción
              </label>
              <label className="field check">
                <input
                  name="commerceEventsEnabled"
                  type="checkbox"
                  checked={draft.commerceEventsEnabled}
                  onChange={(event) => setDraft((current) => ({ ...current, commerceEventsEnabled: event.target.checked }))}
                />
                Eventos comerciales (catálogo y carrito)
              </label>
              <p className="hint">
                Preview y desarrollo no envían datos a Google. Prueba con Tag Assistant y DebugView después de publicar el contenedor.
              </p>
              <p>
                <a href="https://tagmanager.google.com/" target="_blank" rel="noreferrer">
                  Abrir Tag Manager
                </a>
                {" · "}
                <a href="https://analytics.google.com/" target="_blank" rel="noreferrer">
                  Abrir Analytics
                </a>
              </p>
            </BoundForm>
          ) : (
            <div className="seo-read">
              <p>GA4: {draft.ga4MeasurementId || "Sin ID"}</p>
              <p>GTM: {draft.gtmContainerId || "Sin ID"}</p>
              <p>{draft.trackingEnabled ? "Medición activada." : "Medición desactivada."}</p>
            </div>
          )}
        </section>
      </div>
      <aside className="seo-side">
        <section className="seo-card">
          <h2>Checklist</h2>
          <ul className="hint" style={{ margin: 0, paddingLeft: "1.2rem" }}>
            <li>URL pública https correcta en SEO.</li>
            <li>Propiedad de dominio verificada en Search Console.</li>
            <li>Sitemap enviado.</li>
            <li>Contenedor GTM con Google tag de GA4.</li>
            <li>Consentimiento analítico publicado en la tienda.</li>
          </ul>
        </section>
      </aside>
    </div>
  );
}

function DiagnoseButton() {
  const router = useRouter();
  const [state, action, pending] = useActionState(diagnoseSitemapAction, emptyForm);
  useEffect(() => {
    if (state.ok || state.error) router.refresh();
  }, [state.ok, state.error, router]);
  return (
    <form action={action}>
      {state.error ? <p className="note-bad">{state.error}</p> : null}
      {state.ok ? <p className="note-ok">{state.ok}</p> : null}
      <button className="btn" type="submit" disabled={pending}>
        {pending ? "Comprobando" : "Comprobar sitemap"}
      </button>
    </form>
  );
}
