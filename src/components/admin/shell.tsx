"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useId, useRef, useState } from "react";
import { logoutAction } from "@/actions/session";

type LinkItem = { href: string; label: string };

const GROUPS = [
  { label: "Inicio", hrefs: ["/admin"] },
  { label: "Negocio", hrefs: ["/admin/negocio", "/admin/apariencia", "/admin/inicio"] },
  { label: "Catálogo", hrefs: ["/admin/categorias", "/admin/productos", "/admin/atributos", "/admin/multimedia"] },
  { label: "Gestión", hrefs: ["/admin/cotizaciones", "/admin/seo", "/admin/usuarios"] },
];

function current(pathname: string, href: string) {
  if (href === "/admin") return pathname === "/admin";
  return pathname === href || pathname.startsWith(`${href}/`);
}

function MenuLinks({ items, pathname, onNavigate }: { items: LinkItem[]; pathname: string; onNavigate?: () => void }) {
  const grouped = GROUPS.map((group) => ({
    label: group.label,
    items: group.hrefs.flatMap((href) => items.filter((item) => item.href === href)),
  })).filter((group) => group.items.length > 0);
  const listed = new Set(grouped.flatMap((group) => group.items.map((item) => item.href)));
  const rest = items.filter((item) => !listed.has(item.href));
  return (
    <nav aria-label="Administración">
      {grouped.map((group) => (
        <div className="nav-group" key={group.label}>
          <p>{group.label}</p>
          {group.items.map((link) => (
            <Link key={link.href} href={link.href} aria-current={current(pathname, link.href) ? "page" : undefined} onClick={onNavigate}>
              {link.label}
            </Link>
          ))}
        </div>
      ))}
      {rest.map((link) => (
        <Link key={link.href} href={link.href} aria-current={current(pathname, link.href) ? "page" : undefined} onClick={onNavigate}>
          {link.label}
        </Link>
      ))}
      <Link className="nav-out" href="/" onClick={onNavigate}>Ver catálogo</Link>
    </nav>
  );
}

function AccountMenu({ name, email }: { name: string; email: string }) {
  const detailsRef = useRef<HTMLDetailsElement>(null);
  const label = name.trim() || email;
  const initial = label.charAt(0).toUpperCase() || "A";

  useEffect(() => {
    function close(event: PointerEvent) {
      const details = detailsRef.current;
      if (!details?.open || !(event.target instanceof Node) || details.contains(event.target)) return;
      details.open = false;
    }
    document.addEventListener("pointerdown", close);
    return () => document.removeEventListener("pointerdown", close);
  }, []);

  return (
    <details className="account" ref={detailsRef}>
      <summary aria-label={`Cuenta de ${label}`}>
        <span className="account-mark" aria-hidden="true">{initial}</span>
        <span className="account-mail">{label}</span>
      </summary>
      <div className="account-menu">
        <p className="account-name">{label}</p>
        <p className="account-email">{email}</p>
        <form action={logoutAction}>
          <button type="submit">Cerrar sesión</button>
        </form>
      </div>
    </details>
  );
}

export function AdminShell({ links, name, email, children }: { links: LinkItem[]; name: string; email: string; children: React.ReactNode }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const here = links.find((link) => current(pathname, link.href))?.label ?? "Andario Catálogo";

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <div className="admin">
      <aside className="side">
        <Link className="word" href="/admin">Andario Catálogo</Link>
        <MenuLinks items={links} pathname={pathname} />
      </aside>
      <div className="workspace">
        <header className="admin-bar">
          <div className="admin-bar-start">
            <button className="menu-button" type="button" aria-expanded={open} aria-controls="admin-menu" onClick={() => setOpen(true)}>Menú</button>
            <strong>{here}</strong>
          </div>
          <AccountMenu name={name} email={email} />
        </header>
        <div className="main">{children}</div>
      </div>
      <dialog
        ref={dialogRef}
        id="admin-menu"
        className="nav-dialog"
        aria-labelledby={titleId}
        onClose={() => setOpen(false)}
        onCancel={() => setOpen(false)}
      >
        <p id={titleId} className="word">Andario Catálogo</p>
        <MenuLinks items={links} pathname={pathname} onNavigate={() => setOpen(false)} />
      </dialog>
    </div>
  );
}
