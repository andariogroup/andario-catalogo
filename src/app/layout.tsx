import type { Metadata } from "next";
import { Fraunces, Newsreader, Outfit, Source_Sans_3 } from "next/font/google";
import { catalogOrigin, clip, siteUrl } from "@/lib/seo";
import { loadShell } from "@/lib/store";
import "./globals.css";
import "./nav.css";
import "./public.css";

const fraunces = Fraunces({ subsets: ["latin"], style: ["normal", "italic"], variable: "--font-fraunces", display: "swap" });
const outfit = Outfit({ subsets: ["latin"], variable: "--font-outfit", display: "swap" });
const newsreader = Newsreader({ subsets: ["latin"], style: ["normal", "italic"], variable: "--font-newsreader", display: "swap" });
const sourceSans = Source_Sans_3({ subsets: ["latin"], variable: "--font-source", display: "swap" });

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const fallback: Metadata = {
    metadataBase: new URL(siteUrl()),
    title: { default: "Andario Catálogo", template: "%s · Andario Catálogo" },
    description: "Catálogo digital de Andario Group.",
  };
  try {
    const shell = await loadShell();
    if (!shell) return fallback;
    const name = shell.business.name.trim() || "Andario Catálogo";
    const title = shell.settings.metaTitle.trim() || name;
    const description = clip(shell.settings.metaDescription || shell.business.shortDescription || shell.business.slogan, 180);
    const origin = catalogOrigin(shell.settings.publicUrl);
    const image = shell.brand.socialImageUrl || shell.brand.logoUrl;
    const favicon = shell.brand.faviconUrl.trim();
    return {
      metadataBase: new URL(origin),
      title: { default: title, template: `%s · ${name}` },
      ...(description ? { description } : {}),
      alternates: { canonical: "/" },
      // Icono de marca en el layout raíz: evita que un favicon.ico estático de Next tape el parametrizado.
      ...(favicon
        ? {
            icons: {
              icon: [{ url: favicon }],
              shortcut: favicon,
              apple: favicon,
            },
          }
        : {}),
      openGraph: {
        title,
        ...(description ? { description } : {}),
        url: "/",
        ...(image ? { images: [image] } : {}),
      },
      ...(shell.settings.indexable ? {} : { robots: { index: false, follow: false } }),
    };
  } catch {
    return fallback;
  }
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  let font = "fraunces";
  try {
    const shell = await loadShell();
    if (shell?.brand.fontPair === "newsreader") font = "newsreader";
  } catch {
    font = "fraunces";
  }
  // Solo aplica el par activo al DOM; ambos pares siguen definidos para cambio de marca sin redeploy.
  const fontClass =
    font === "newsreader" ? `${newsreader.variable} ${sourceSans.variable}` : `${fraunces.variable} ${outfit.variable}`;
  return (
    <html lang="es" data-font={font} data-scroll-behavior="smooth" className={fontClass}>
      <body style={{ fontFamily: font === "newsreader" ? "var(--font-source)" : "var(--font-outfit)" }}>{children}</body>
    </html>
  );
}
