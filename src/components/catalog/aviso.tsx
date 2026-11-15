"use client";

import { useState } from "react";

export function AnnouncementBar({ text, href, background, color, dismissible }: { text: string; href: string; background: string; color: string; dismissible: boolean }) {
  const [open, setOpen] = useState(true);
  if (!open) return null;
  return (
    <div className="topbar" style={{ background, color }}>
      {href ? <a href={href}>{text}</a> : text}
      {dismissible ? <button className="quiet" type="button" onClick={() => setOpen(false)}>Cerrar</button> : null}
    </div>
  );
}
