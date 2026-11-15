import { HomeStudio, type HomeEditorData } from "@/components/admin/inicio-form";
import { requirePermission } from "@/lib/auth";
import { cloudinaryEnv } from "@/lib/env";
import { loadHomeEditor } from "@/lib/store";

export default async function HomeAdminPage() {
  const homePromise = loadHomeEditor();
  await requirePermission("content", "write");
  const home = await homePromise;
  if (!home?.hero || !home.bar) return <p>No hay base de datos.</p>;
  const data: HomeEditorData = {
    hero: {
      mode: home.hero.mode,
      desktopUrl: home.hero.desktopUrl,
      videoUrl: home.hero.videoUrl,
      title: home.hero.title,
      subtitle: home.hero.subtitle,
      ctaLabel: home.hero.ctaLabel,
      ctaHref: home.hero.ctaHref,
      align: home.hero.align,
      overlay: home.hero.overlay,
      autoplay: home.hero.autoplay,
      loop: home.hero.loop,
      active: home.hero.active,
    },
    slides: home.slides.map((slide) => ({ id: slide.id, desktopUrl: slide.desktopUrl, title: slide.title, subtitle: slide.subtitle, sortOrder: slide.sortOrder })),
    bar: {
      active: home.bar.active,
      text: home.bar.text,
      href: home.bar.href,
      background: home.bar.background,
      color: home.bar.color,
      dismissible: home.bar.dismissible,
      startsOn: home.bar.startsOn,
      endsOn: home.bar.endsOn,
    },
    sections: home.sections.map((section) => ({ key: section.key, title: section.title, subtitle: section.subtitle, enabled: section.enabled, sortOrder: section.sortOrder })),
    banners: home.promo.map((banner) => ({ id: banner.id, title: banner.title, subtitle: banner.subtitle, imageUrl: banner.imageUrl, href: banner.href, sortOrder: banner.sortOrder })),
  };
  return (
    <main>
      <p>Portada</p>
      <h1>Página de inicio</h1>
      <p className="lead">Arma el hero, el aviso y el orden de la portada. Cada bloque se publica por separado y la vista previa cambia antes de guardar.</p>
      <HomeStudio data={data} uploadsReady={Boolean(cloudinaryEnv())} />
    </main>
  );
}
