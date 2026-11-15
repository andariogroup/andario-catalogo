"use client";

import { useEffect, useId, useRef, useState } from "react";
import { fichaShowGalleryControls } from "@/lib/ficha-presentation";
import { mediaDeliveryUrl } from "@/lib/images";

export function ProductGallery({ name, photos }: { name: string; photos: { url: string; alt: string }[] }) {
  const [index, setIndex] = useState(0);
  const [zoomed, setZoomed] = useState(false);
  const labelId = useId();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const current = photos[index] ?? photos[0];
  const multi = fichaShowGalleryControls(photos.length);

  useEffect(() => {
    setIndex(0);
  }, [photos]);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (zoomed && !dialog.open) dialog.showModal();
    if (!zoomed && dialog.open) dialog.close();
  }, [zoomed]);

  if (!current) return <span className="ph ficha-photo" aria-hidden="true" />;

  function go(delta: number) {
    if (!multi) return;
    setIndex((value) => (value + delta + photos.length) % photos.length);
  }

  return (
    <div className="ficha-gallery">
      <div className="ficha-stage">
        <button
          className="ficha-main"
          type="button"
          onClick={() => setZoomed(true)}
          aria-labelledby={labelId}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            className="ficha-photo"
            src={mediaDeliveryUrl(current.url, { width: 960, height: 1200, crop: "limit" })}
            alt={current.alt || name}
            width={960}
            height={1200}
            fetchPriority="high"
            decoding="async"
          />
          <span id={labelId} className="visually-hidden">
            Ampliar imagen de {name}
          </span>
        </button>
        {multi ? (
          <>
            <button className="ficha-nav prev" type="button" aria-label="Imagen anterior" onClick={() => go(-1)}>
              ‹
            </button>
            <button className="ficha-nav next" type="button" aria-label="Imagen siguiente" onClick={() => go(1)}>
              ›
            </button>
          </>
        ) : null}
      </div>

      {multi ? (
        <div className="ficha-thumbs" role="tablist" aria-label={`Fotografías de ${name}`}>
          {photos.map((photo, item) => (
            <button
              key={`${photo.url}-${item}`}
              type="button"
              role="tab"
              aria-selected={item === index}
              aria-label={`Foto ${item + 1} de ${photos.length}`}
              onClick={() => setIndex(item)}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={mediaDeliveryUrl(photo.url, { width: 144, height: 180, crop: "fill" })}
                alt=""
                width={144}
                height={180}
                loading="lazy"
                decoding="async"
              />
            </button>
          ))}
        </div>
      ) : null}

      <dialog
        ref={dialogRef}
        className="ficha-zoom"
        onClose={() => setZoomed(false)}
        onClick={(event) => {
          if (event.target === dialogRef.current) setZoomed(false);
        }}
        onKeyDown={(event) => {
          if (event.key === "ArrowLeft") go(-1);
          if (event.key === "ArrowRight") go(1);
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={mediaDeliveryUrl(current.url, { width: 1600, crop: "limit" })}
          alt={current.alt || name}
        />
        <button className="quiet" type="button" onClick={() => setZoomed(false)}>
          Cerrar
        </button>
      </dialog>
    </div>
  );
}
