import Link from "next/link";
import {
  aboutCatalogCtaLabel,
  aboutCommercialNotes,
  aboutContactAvailable,
  aboutHasPlace,
  aboutLead,
  aboutLocationLine,
  aboutPageTitle,
  aboutStoryBody,
  aboutTrustMessage,
  aboutWhatsAppLabel,
  aboutWithoutLocationEcho,
  aboutYearLabel,
  publicBusinessCopy,
  scrubPlatformSentences,
  type AboutBusiness,
} from "@/lib/about-page";
import { mapEmbedSrc } from "@/lib/maps";
import { formatPublicPhone, telHref } from "@/lib/phone";
import { whatsappHref } from "@/lib/whatsapp";

type Props = {
  business: AboutBusiness;
  whatsappMessage: string;
};

function Fact({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="about-fact">
      <dt>{label}</dt>
      <dd>{children}</dd>
    </div>
  );
}

export function AboutPageView({ business, whatsappMessage }: Props) {
  const showPlace = aboutHasPlace(business);
  const title = aboutPageTitle(business);
  const yearLabel = aboutYearLabel(business.yearStarted);
  const lead = aboutLead(business, { placeVisible: showPlace });
  const story = aboutStoryBody(business, { placeVisible: showPlace });
  const trust = aboutTrustMessage(business);
  const image = publicBusinessCopy(business.storyImageUrl);
  const location = aboutLocationLine(business);
  const hours = publicBusinessCopy(business.hours);
  const attention =
    aboutWithoutLocationEcho(business.attentionScope, business, { placeVisible: showPlace }) ||
    (!showPlace ? scrubPlatformSentences(business.attentionScope) : "");
  const { delivery, terms } = aboutCommercialNotes(business);
  const email = publicBusinessCopy(business.email);
  const phoneRaw = publicBusinessCopy(business.phone);
  const phone = phoneRaw ? formatPublicPhone(phoneRaw) : "";
  const phoneCall = phoneRaw ? telHref(phoneRaw) : null;
  const mapsUrl = publicBusinessCopy(business.mapsUrl);
  const mapEmbed = mapsUrl ? mapEmbedSrc(mapsUrl) : "";
  const chat = whatsappHref(business.whatsapp, whatsappMessage || `Hola, vi ${business.name}.`);
  const catalogLabel = aboutCatalogCtaLabel(business);
  const showContact = aboutContactAvailable(business);

  const showChannels = Boolean(chat || phone || email || attention);
  const showPlaceBlock = Boolean((showPlace && location) || hours || mapEmbed || (mapsUrl && !mapEmbed));
  const showConditions = Boolean(delivery || terms);
  const dualColumns = showChannels && showPlaceBlock;
  const copyDensity = [lead, story, trust, yearLabel].filter(Boolean).length;
  const storyClass = [
    "about-story",
    image ? "has-media" : "",
    image && copyDensity <= 2 ? "is-compact" : "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <main className="wrap section about-page">
      <section className={storyClass} aria-labelledby="about-title">
        <div className="about-story-copy">
          <p className="about-kicker">El negocio</p>
          <h1 id="about-title">{title}</h1>
          {yearLabel ? <p className="about-since">{yearLabel}</p> : null}
          {lead ? <p className="about-lead">{lead}</p> : null}
          {story ? <p className="about-history">{story}</p> : null}
          {trust ? <p className="about-trust">{trust}</p> : null}
          <div className="about-actions">
            <Link className="btn" href="/catalogo">
              {catalogLabel}
            </Link>
            {chat ? (
              <a className="quiet" href={chat}>
                {aboutWhatsAppLabel(business)}
              </a>
            ) : null}
          </div>
        </div>
        {image ? (
          <figure className="about-story-media">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={image}
              alt={`Imagen de ${publicBusinessCopy(business.name) || "el negocio"}`}
            />
          </figure>
        ) : null}
      </section>

      {showContact ? (
        <section className="about-contact" aria-labelledby="contact-title">
          <header className="about-contact-head">
            <h2 id="contact-title">Estamos para atenderte</h2>
            <p>Resuelve dudas, confirma disponibilidad y avanza por el canal que te resulte más cómodo.</p>
          </header>

          <div
            className={[
              "about-contact-grid",
              dualColumns ? "is-dual" : "",
              !showChannels && showPlaceBlock ? "place-only" : "",
              showChannels && !showPlaceBlock ? "channels-only" : "",
            ]
              .filter(Boolean)
              .join(" ")}
          >
            {showChannels ? (
              <div className="about-group about-channels">
                <h3 className="about-group-title">Atención y consultas</h3>
                {chat ? (
                  <div className="about-contact-actions about-contact-primary">
                    <a className="btn" href={chat}>
                      {aboutWhatsAppLabel(business)}
                    </a>
                  </div>
                ) : null}
                <dl className="about-facts">
                  {phone && phoneCall ? (
                    <Fact label="Teléfono">
                      <a href={phoneCall}>{phone}</a>
                    </Fact>
                  ) : null}
                  {email ? (
                    <Fact label="Correo">
                      <a href={`mailto:${email}`}>{email}</a>
                    </Fact>
                  ) : null}
                  {attention ? <Fact label="Modalidad">{attention}</Fact> : null}
                </dl>
                {!chat && phone && phoneCall ? (
                  <div className="about-contact-actions">
                    <a className="btn" href={phoneCall}>
                      Llamar
                    </a>
                  </div>
                ) : phone && phoneCall ? (
                  <div className="about-contact-actions">
                    <a className="quiet" href={phoneCall}>
                      Llamar
                    </a>
                  </div>
                ) : null}
              </div>
            ) : null}

            {showPlaceBlock ? (
              <div className="about-group about-place-block">
                <h3 className="about-group-title">Ubicación y horarios</h3>
                <dl className="about-facts">
                  {showPlace && location ? <Fact label="Dirección">{location}</Fact> : null}
                  {hours ? <Fact label="Horario">{hours}</Fact> : null}
                </dl>
                {mapEmbed ? (
                  <figure className="about-map">
                    <iframe
                      src={mapEmbed}
                      title={`Mapa de ${publicBusinessCopy(business.name) || "ubicación"}`}
                      loading="lazy"
                      referrerPolicy="no-referrer-when-downgrade"
                    />
                    {mapsUrl ? (
                      <a href={mapsUrl} target="_blank" rel="noreferrer">
                        Cómo llegar
                      </a>
                    ) : null}
                  </figure>
                ) : mapsUrl ? (
                  <div className="about-contact-actions">
                    <a className="quiet" href={mapsUrl} target="_blank" rel="noreferrer">
                      Cómo llegar
                    </a>
                  </div>
                ) : null}
              </div>
            ) : null}
          </div>

          {showConditions ? (
            <div className="about-group about-group-secondary about-conditions">
              <h3 className="about-group-title">Antes de comprar o contratar</h3>
              <dl className="about-facts">
                {delivery ? <Fact label="Entrega o prestación">{delivery}</Fact> : null}
                {terms ? <Fact label="Condiciones">{terms}</Fact> : null}
              </dl>
            </div>
          ) : null}

          {!chat && !phone && !mapsUrl && !showConditions ? (
            <div className="about-contact-actions">
              <Link className="btn" href="/catalogo">
                {catalogLabel}
              </Link>
            </div>
          ) : null}
        </section>
      ) : (
        <section className="about-contact about-contact-minimal" aria-labelledby="contact-title">
          <header className="about-contact-head">
            <h2 id="contact-title">Sigue explorando</h2>
            <p>Cuando el negocio publique un canal de atención, aparecerá aquí. Mientras tanto puedes revisar el catálogo.</p>
          </header>
          <div className="about-contact-actions">
            <Link className="btn" href="/catalogo">
              {catalogLabel}
            </Link>
          </div>
        </section>
      )}
    </main>
  );
}
