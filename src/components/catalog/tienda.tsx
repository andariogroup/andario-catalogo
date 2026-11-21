"use client";

import Link from "next/link";
import { Suspense, type CSSProperties, type ReactNode } from "react";
import { Lock } from "lucide-react";
import { formatPublicPhone, telHref } from "@/lib/phone";
import { whatsappHref } from "@/lib/whatsapp";
import type { loadShell } from "@/lib/store";
import { CartNavLink } from "@/components/catalog/cart";
import { HeaderSearch } from "@/components/catalog/header-search";
import { ShopMenu, ShopMenuButton, ShopMenuLinks } from "@/components/catalog/shop-nav";
import { cartStoreId } from "@/lib/cart";
import { ConsentBanner } from "@/components/consent/consent-banner";
import { ConsentProvider } from "@/components/consent/consent-provider";
import { AnalyticsPathWatcher, GtmLoader } from "@/components/consent/gtm-loader";
import { TrackedWhatsAppLink } from "@/components/consent/analytics-hooks";

type Shell = NonNullable<Awaited<ReturnType<typeof loadShell>>>;

export function themeStyle(shell: Shell): CSSProperties {
  const brand = shell.brand;
  return {
    "--paper": brand.backgroundColor,
    "--ink": brand.textColor,
    "--muted": brand.mutedColor,
    "--line": brand.borderColor,
    "--primary": brand.buttonColor,
    "--primary-ink": brand.buttonTextColor,
    "--accent": brand.accentColor,
    "--radius": `${brand.radius}px`,
  } as CSSProperties;
}

const POLICY_LINKS = [
  ["privacidad", "Privacidad"],
  ["terminos", "Términos"],
  ["envios", "Envíos"],
  ["cambios", "Cambios"],
] as const;

function logoSrc(url: string) {
  const mark = "/upload/";
  const index = url.indexOf(mark);
  if (!url.includes("res.cloudinary.com") || index < 0 || url.includes("/e_trim/")) return url;
  return `${url.slice(0, index + mark.length)}e_trim/${url.slice(index + mark.length)}`;
}

const SOCIAL_ORDER = ["instagram", "facebook", "tiktok", "youtube", "website"] as const;

function socialLabel(network: string) {
  if (network === "website") return "Sitio web";
  if (network === "tiktok") return "TikTok";
  if (network === "youtube") return "YouTube";
  return `${network.slice(0, 1).toUpperCase()}${network.slice(1)}`;
}

function SocialIcon({ network }: { network: string }) {
  if (network === "facebook") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path fill="currentColor" d="M14.2 21v-7.1h2.4l.4-2.8h-2.8V9.3c0-.8.2-1.4 1.4-1.4H17V5.2A18 18 0 0 0 14.8 5c-2.2 0-3.7 1.3-3.7 3.8v1.3H8.5v2.8h2.6V21z" />
      </svg>
    );
  }
  if (network === "tiktok") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path fill="currentColor" d="M14 4c.4 2.4 1.8 4 4.2 4.3v2.4a6.6 6.6 0 0 1-4.2-1.4v6.3a5.6 5.6 0 1 1-5.6-5.6c.3 0 .6 0 .9.1v2.6a3 3 0 1 0 2.1 2.9V4z" />
      </svg>
    );
  }
  if (network === "youtube") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <rect x="3" y="6.5" width="18" height="11" rx="3" fill="none" stroke="currentColor" strokeWidth="1.8" />
        <path fill="currentColor" d="M11 9.8v4.4l3.6-2.2z" />
      </svg>
    );
  }
  if (network === "website") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <circle cx="12" cy="12" r="8" fill="none" stroke="currentColor" strokeWidth="1.8" />
        <path fill="none" stroke="currentColor" strokeWidth="1.8" d="M4 12h16M12 4c2.2 2.2 3.3 4.8 3.3 8s-1.1 5.8-3.3 8c-2.2-2.2-3.3-4.8-3.3-8s1.1-5.8 3.3-8z" />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <rect x="4" y="4" width="16" height="16" rx="5" fill="none" stroke="currentColor" strokeWidth="1.8" />
      <circle cx="12" cy="12" r="3.4" fill="none" stroke="currentColor" strokeWidth="1.8" />
      <circle cx="17.2" cy="6.8" r="1" fill="currentColor" />
    </svg>
  );
}

export function ShopFrame({
  shell,
  policies,
  showAdminLink = false,
  measurement,
  children,
}: {
  shell: Shell;
  policies: string[];
  showAdminLink?: boolean;
  measurement?: {
    gtmContainerId: string;
    measurementConfigured: boolean;
    commerceEventsEnabled: boolean;
    noticeEnabled: boolean;
    policyVersion: string;
    expirationDays: number;
    noticeTitle: string;
    noticeDescription: string;
    policyPath: string;
  };
  children: ReactNode;
}) {
  const { business, brand, settings, socials } = shell;
  const chat = whatsappHref(business.whatsapp, settings.whatsappGeneral || `Hola, vi ${business.name}.`);
  const phoneCall = telHref(business.phone);
  const phoneLabel = formatPublicPhone(business.phone);
  const publishedSocials = SOCIAL_ORDER.flatMap((network) => {
    const item = socials.find((entry) => entry.network === network && entry.url);
    return item ? [item] : [];
  });
  const showLogo = Boolean(brand.showLogo && brand.logoUrl);
  const showName = brand.showName || !showLogo;
  const privacy = measurement ?? {
    gtmContainerId: "",
    measurementConfigured: false,
    commerceEventsEnabled: true,
    noticeEnabled: false,
    policyVersion: "1.0",
    expirationDays: 180,
    noticeTitle: "Tu privacidad importa",
    noticeDescription: "",
    policyPath: "/politicas/privacidad",
  };
  const frame = (
    <div className="shop" style={themeStyle(shell)}>
      <a className="skip-link" href="#contenido">Saltar al contenido</a>
      <ShopMenu>
      <header className="header" style={brand.stickyHeader ? { position: "sticky", top: 0, zIndex: 4, background: "color-mix(in srgb, var(--paper) 96%, transparent)" } : undefined}>
        <Link className={showLogo ? "brand-lockup has-logo" : "brand-lockup"} href="/">
          {showLogo ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img className="brand-logo" src={logoSrc(brand.logoUrl)} alt={brand.showName ? "" : business.name} />
          ) : null}
          {showName ? <span className="brand-name">{brand.showName ? business.name : "Catálogo"}</span> : null}
        </Link>
        <div className="header-actions">
          {brand.showSearch ? (
            <Suspense fallback={<div className="search" aria-hidden="true" />}>
              <HeaderSearch />
            </Suspense>
          ) : null}
          <CartNavLink storeId={cartStoreId(business.id, settings.publicUrl)} />
          <ShopMenuButton />
        </div>
        <ShopMenuLinks />
      </header>
      </ShopMenu>
      <span id="contenido" tabIndex={-1} />
      {children}
      <footer className="footer">
        <div className="footer-inner">
          <div className="footer-brand">
            <strong className="word">{business.name}</strong>
            {business.slogan || business.shortDescription ? <p>{business.slogan || business.shortDescription}</p> : null}
            {chat ? (
              <TrackedWhatsAppLink className="footer-chat" href={chat} source="footer">
                Consultar por WhatsApp
              </TrackedWhatsAppLink>
            ) : null}
          </div>
          <div className="footer-links">
            <nav aria-label="Pie del catálogo">
              <p className="footer-label">Explorar</p>
              <Link href="/catalogo">Catálogo</Link>
              <Link href="/carrito">Carrito</Link>
              <Link href="/sobre-nosotros">El negocio</Link>
              {POLICY_LINKS.filter(([slug]) => policies.includes(slug)).map(([slug, label]) => (
                <Link key={slug} href={`/politicas/${slug}`}>{label}</Link>
              ))}
              <Link href="/lista">Lista de interés</Link>
            </nav>
            <div>
              <p className="footer-label">Contacto</p>
              {phoneCall && phoneLabel ? <a href={phoneCall}>{phoneLabel}</a> : null}
              {business.email ? <a href={`mailto:${business.email}`}>{business.email}</a> : null}
            </div>
          </div>
          <div className="footer-end">
            <div className="footer-meta">
              <p>{[business.name, business.city, business.yearStarted ? String(business.yearStarted) : ""].filter(Boolean).join(" · ")}</p>
              <a href="https://www.andariogroup.com" target="_blank" rel="noreferrer">Catálogo por andariogroup</a>
              {showAdminLink ? (
                <Link className="footer-admin" href="/admin">
                  <Lock aria-hidden="true" />
                  Administrar tienda
                </Link>
              ) : null}
            </div>
            {publishedSocials.length ? (
              <div className="footer-socials">
                {publishedSocials.map((item) => (
                  <a key={item.id} href={item.url} target="_blank" rel="noreferrer" aria-label={socialLabel(item.network)}>
                    <SocialIcon network={item.network} />
                  </a>
                ))}
              </div>
            ) : null}
          </div>
        </div>
      </footer>
      <ConsentBanner title={privacy.noticeTitle} description={privacy.noticeDescription} policyPath={privacy.policyPath} />
      <GtmLoader containerId={privacy.gtmContainerId} measurementConfigured={privacy.measurementConfigured} />
      <AnalyticsPathWatcher />
    </div>
  );
  return (
    <ConsentProvider
      noticeEnabled={privacy.noticeEnabled}
      policyVersion={privacy.policyVersion}
      expirationDays={privacy.expirationDays}
      measurementConfigured={privacy.measurementConfigured}
      commerceEventsEnabled={privacy.commerceEventsEnabled}
      gtmContainerId={privacy.gtmContainerId}
    >
      {frame}
    </ConsentProvider>
  );
}

export function EmptyCatalog({ title, body }: { title: string; body: string }) {
  return (
    <main className="wrap" style={{ padding: "4rem 0" }}>
      <p className="display">{title}</p>
      <p>{body}</p>
    </main>
  );
}
