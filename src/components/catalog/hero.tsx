"use client";

import { useEffect, useState } from "react";
import { mediaDeliveryUrl } from "@/lib/images";

type Slide = { image: string; title: string; subtitle: string; ctaLabel: string; ctaHref: string };

export function HeroStage({
  mode,
  title,
  subtitle,
  ctaLabel,
  ctaHref,
  overlay,
  height,
  image,
  poster,
  video,
  autoplay,
  loop,
  slides,
}: {
  mode: string;
  title: string;
  subtitle: string;
  ctaLabel: string;
  ctaHref: string;
  overlay: number;
  height: string;
  image: string;
  poster: string;
  video: string;
  autoplay: boolean;
  loop: boolean;
  slides: Slide[];
}) {
  const [index, setIndex] = useState(0);
  const [reduce, setReduce] = useState(false);
  const [paused, setPaused] = useState(false);
  const deck = slides.filter((slide) => slide.image);
  const current = mode === "carousel" ? deck[index] : undefined;

  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const apply = () => setReduce(media.matches);
    apply();
    media.addEventListener("change", apply);
    return () => media.removeEventListener("change", apply);
  }, []);

  useEffect(() => {
    if (mode !== "carousel" || reduce || paused || deck.length < 2 || !autoplay) return;
    const timer = window.setInterval(() => setIndex((value) => (value + 1) % deck.length), 6000);
    return () => window.clearInterval(timer);
  }, [autoplay, deck.length, mode, paused, reduce]);

  const shownTitle = current?.title || title;
  const shownSubtitle = current?.subtitle || subtitle;
  const shownCta = current?.ctaLabel || ctaLabel;
  const shownHref = current?.ctaHref || ctaHref;
  const shownImage = mode === "carousel" ? current?.image || image : image;
  const shade = `linear-gradient(transparent, rgb(0 0 0 / ${Math.min(overlay, 80)}%))`;

  function move(step: number) {
    if (!deck.length) return;
    setPaused(true);
    setIndex((value) => (value + step + deck.length) % deck.length);
  }

  return (
    <section
      className="hero"
      style={{ minHeight: height }}
      aria-roledescription={mode === "carousel" ? "carrusel" : undefined}
      onKeyDown={(event) => {
        if (mode !== "carousel") return;
        if (event.key === "ArrowRight") move(1);
        if (event.key === "ArrowLeft") move(-1);
      }}
      tabIndex={mode === "carousel" ? 0 : undefined}
    >
      {mode === "video" && video && !reduce ? <video src={video} poster={poster || undefined} autoPlay={autoplay} muted loop={loop} playsInline /> : null}
      {(mode !== "video" || reduce || !video) && shownImage ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={mediaDeliveryUrl(mode === "video" ? poster || shownImage : shownImage, { width: 1600, crop: "limit" })}
          alt=""
          fetchPriority="high"
          decoding="async"
        />
      ) : null}
      <div className="hero-copy" style={{ background: shade }}>
        <h1>{shownTitle}</h1>
        {shownSubtitle ? <p>{shownSubtitle}</p> : null}
        {shownCta && shownHref ? <a className="btn" href={shownHref}>{shownCta}</a> : null}
        {mode === "carousel" && deck.length > 1 ? (
          <div className="row">
            <button className="quiet" type="button" onClick={() => move(-1)}>Anterior</button>
            <button className="quiet" type="button" onClick={() => move(1)}>Siguiente</button>
            {deck.map((slide, slideIndex) => (
              <button key={`${slide.image}-${slideIndex}`} className="quiet" type="button" aria-current={slideIndex === index} onClick={() => { setPaused(true); setIndex(slideIndex); }}>
                {slideIndex + 1}
              </button>
            ))}
          </div>
        ) : null}
      </div>
    </section>
  );
}
