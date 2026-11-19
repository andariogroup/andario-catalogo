import type { Metadata } from "next";
import Link from "next/link";
import { AnnouncementBar } from "@/components/catalog/aviso";
import { HeroStage } from "@/components/catalog/hero";
import { formatPesos } from "@/lib/money";
import { clip } from "@/lib/seo";
import { listCatalog, loadHome, productPhotos, recordEvent } from "@/lib/store";
import { mapEmbedSrc } from "@/lib/maps";
import { telHref } from "@/lib/phone";
import { whatsappHref } from "@/lib/whatsapp";

export async function generateMetadata(): Promise<Metadata> {
  return { alternates: { canonical: "/" } };
}

function trustPoints(city: string) {
  return [
    { icon: "shield" as const, label: "Atención personalizada" },
    ...(city ? [{ icon: "pin" as const, label: `Estamos en ${city}` }] : []),
    { icon: "doc" as const, label: "Información transparente" },
  ];
}

function TrustIcon({ name }: { name: "shield" | "pin" | "doc" }) {
  if (name === "shield") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M12 3.4 19 6.1v5.4c0 4.1-2.8 7-7 8.4-4.2-1.4-7-4.3-7-8.4V6.1L12 3.4z" />
        <path d="m8.7 12 2.1 2.1 4.4-4.5" />
      </svg>
    );
  }
  if (name === "pin") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M12 21s6.2-5.1 6.2-10.1a6.2 6.2 0 1 0-12.4 0C5.8 15.9 12 21 12 21z" />
        <circle cx="12" cy="10.8" r="2.1" />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M7 3.4h7.1L19 8.2V20.6H7z" />
      <path d="M14 3.6v4.6h4.5M9.2 12.2h5.6M9.2 15.7h5.6" />
    </svg>
  );
}

function storyForHome(value: string) {
  return value
    .replace(/\s+/g, " ")
    .trim()
    .split(/(?<=[.!?])\s+/)
    .filter((sentence) => !/este texto presenta el local en el cat[aá]logo/i.test(sentence))
    .filter((sentence) => !/se puede reemplazar con la historia real/i.test(sentence))
    .join(" ")
    .trim();
}

function visible(starts: string, ends: string) {
  const today = new Date().toISOString().slice(0, 10);
  if (starts && today < starts) return false;
  if (ends && today > ends) return false;
  return true;
}

export default async function HomePage() {
  const home = await loadHome();
  if (!home) return null;
  await recordEvent("catalog_view", "/");
  const { business, settings, hero, slides, bar, sections, promo, cats, featured, news } = home;
  const catalog = await listCatalog({ page: 1 });
  async function withPhoto(product: (typeof featured)[number]) {
    return { product, photo: (await productPhotos(product.id))[0]?.url ?? "" };
  }
  const featuredCards = await Promise.all(featured.map(withPhoto));
  const newsCards = await Promise.all(news.map(withPhoto));
  const catalogCards = await Promise.all(catalog.rows.map(withPhoto));
  const homeCategories = cats.filter((category) => category.showOnHome && !category.parentId);
  const chat = whatsappHref(business.whatsapp, settings.whatsappGeneral || `Hola, vi ${business.name}.`);
  const phoneCall = telHref(business.phone);
  const ordered = [...sections].filter((section) => section.enabled);
  const cardsFor = (key: string) => (key === "news" ? newsCards : key === "catalog" ? catalogCards : featuredCards);
  return (
    <main>
      {bar?.active && bar.text && visible(bar.startsOn, bar.endsOn) ? (
        <AnnouncementBar text={bar.text} href={bar.href} background={bar.background} color={bar.color} dismissible={bar.dismissible} />
      ) : null}
      <div className="wrap">
        {hero?.active ? (
          <HeroStage
            mode={hero.mode}
            title={hero.title || business.name}
            subtitle={hero.subtitle || business.slogan}
            ctaLabel={hero.ctaLabel}
            ctaHref={hero.ctaHref}
            overlay={hero.overlay}
            height={hero.height || "78vh"}
            image={hero.desktopUrl}
            poster={hero.posterUrl}
            video={hero.videoUrl}
            autoplay={hero.autoplay}
            loop={hero.loop}
            slides={slides.map((slide) => ({ image: slide.desktopUrl, title: slide.title, subtitle: slide.subtitle, ctaLabel: slide.ctaLabel, ctaHref: slide.ctaHref }))}
          />
        ) : null}
        {ordered.map((section) => {
          const cards = cardsFor(section.key);
          const story = clip(business.story || business.description || business.shortDescription, 420);
          const aboutStory = storyForHome(business.story || business.description || business.shortDescription);
          const aboutPlace = [business.address, business.city].filter(Boolean).join(" · ");
          const contactLines = [business.address, [business.city, business.region].filter(Boolean).join(", "), business.hours].filter(Boolean);
          const mapEmbed = mapEmbedSrc(business.mapsUrl);
          if (section.key === "categories" && homeCategories.length === 0) return null;
          if ((section.key === "featured" || section.key === "news" || section.key === "catalog") && cards.length === 0) return null;
          if (section.key === "banner" && promo.length === 0) return null;
          if (section.key === "about" && !story && !business.storyImageUrl) return null;
          if (section.key === "trust" && !(business.commercialMessage || business.attentionScope)) return null;
          if (section.key === "contact" && contactLines.length === 0 && !business.phone && !business.mapsUrl) return null;
          return (
            <section className={section.key === "contact" ? "section band" : section.key === "trust" ? "section trust-band" : "section"} key={section.key}>
              {section.key === "about" ? null : (
                <header className="home-head">
                  <h2>{section.title}</h2>
                  {section.subtitle ? <p>{section.subtitle}</p> : null}
                </header>
              )}
              {section.key === "categories" ? (
                <div className="home-cats">
                  {homeCategories.map((category) => (
                    <Link
                      className={category.imageUrl ? "cat-card has-photo" : "cat-card"}
                      key={category.id}
                      href={`/categoria/${category.slug}`}
                      title={category.name}
                    >
                      {category.imageUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={category.imageUrl} alt="" />
                      ) : null}
                      <strong>{category.name}</strong>
                    </Link>
                  ))}
                </div>
              ) : null}
              {section.key === "featured" || section.key === "news" || section.key === "catalog" ? (
                <div className="grid cards home-grid">
                  {cards.map(({ product, photo }) => (
                    <Link className="piece" key={product.id} href={`/producto/${product.slug}`}>
                      {photo ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={photo} alt={product.name} />
                      ) : <span className="ph" />}
                      <h3>{product.name}</h3>
                      <p className="price">{product.priceMode === "ask" ? "Consultar" : formatPesos(product.pricePesos == null ? null : Number(product.pricePesos), business.currencySymbol)}</p>
                    </Link>
                  ))}
                </div>
              ) : null}
              {section.key === "banner" ? (
                <div className="promo-list">
                  {promo.map((item) => {
                    const card = (
                      <>
                        {item.imageUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={item.imageUrl} alt="" />
                        ) : null}
                        <div className="promo-copy">
                          <h3>{item.title}</h3>
                          {item.subtitle ? <p>{item.subtitle}</p> : null}
                          {item.href ? <span className="btn">Ver la selección</span> : null}
                        </div>
                      </>
                    );
                    if (!item.href) return <article className="promo" key={item.id}>{card}</article>;
                    if (item.href.startsWith("/")) return <Link className="promo" key={item.id} href={item.href}>{card}</Link>;
                    return <a className="promo" key={item.id} href={item.href}>{card}</a>;
                  })}
                </div>
              ) : null}
              {section.key === "about" ? (
                <article className="about-card">
                  <div className="about-copy">
                    <p className="about-kicker">Nuestra historia</p>
                    <h2>{section.title}</h2>
                    {section.subtitle && section.subtitle !== aboutStory ? <p>{section.subtitle}</p> : null}
                    {aboutStory ? <p>{aboutStory}</p> : null}
                    {aboutPlace ? (
                      <p className="about-place">
                        <svg viewBox="0 0 24 24" aria-hidden="true">
                          <path d="M12 21s6-5 6-10a6 6 0 1 0-12 0c0 5 6 10 6 10z" />
                          <circle cx="12" cy="11" r="2" />
                        </svg>
                        <span>{aboutPlace}</span>
                      </p>
                    ) : null}
                    <Link className="btn" href="/sobre-nosotros">Conocer nuestra historia</Link>
                  </div>
                  {business.storyImageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={business.storyImageUrl} alt={business.storyTitle || business.name} />
                  ) : null}
                </article>
              ) : null}
              {section.key === "trust" ? (
                <article className="trust">
                  <p>{business.commercialMessage || business.attentionScope}</p>
                  {business.commercialMessage && business.attentionScope ? <p className="trust-note">{business.attentionScope}</p> : null}
                  <ul className="trust-points">
                    {trustPoints(business.city).map((point) => (
                      <li key={point.label}>
                        <TrustIcon name={point.icon} />
                        <span>{point.label}</span>
                      </li>
                    ))}
                  </ul>
                </article>
              ) : null}
              {section.key === "contact" ? (
                <article className="help">
                  <div className="help-copy">
                    <div className="help-intro">
                      <p className="help-kicker">El local</p>
                      {business.address ? <p className="help-address">{business.address}</p> : null}
                      <div className="help-place">
                        {[business.city, business.region].filter(Boolean).join(", ") ? <p>{[business.city, business.region].filter(Boolean).join(", ")}</p> : null}
                        {business.hours ? <p>{business.hours}</p> : null}
                      </div>
                    </div>
                    <div className="help-actions">
                      {chat ? <a className="btn" href={chat}>Escribir por WhatsApp</a> : null}
                      {phoneCall ? (
                        <a className="quiet" href={phoneCall}>
                          Llamar
                        </a>
                      ) : null}
                      {business.mapsUrl && !mapEmbed ? <a className="quiet" href={business.mapsUrl}>Cómo llegar</a> : null}
                    </div>
                  </div>
                  {mapEmbed ? (
                    <figure className="help-map">
                      <iframe src={mapEmbed} title={`Cómo llegar a ${business.name}`} loading="lazy" referrerPolicy="no-referrer-when-downgrade" />
                      <a href={business.mapsUrl} target="_blank" rel="noreferrer">Cómo llegar</a>
                    </figure>
                  ) : null}
                </article>
              ) : null}
            </section>
          );
        })}
      </div>
    </main>
  );
}
