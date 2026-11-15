"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { createContext, useContext, useEffect, useId, useRef, useState } from "react";
import { LayoutGrid, Menu, ShoppingBag, Store, X } from "lucide-react";
import { shopNavAriaCurrent, shopNavBusinessActive, shopNavCatalogActive } from "@/lib/shop-nav";

const LINKS = [
  { href: "/catalogo", label: "Explorar catálogo", main: true as const, icon: "grid" as const },
  { href: "/carrito", label: "Carrito", main: false as const, icon: "cart" as const },
  { href: "/sobre-nosotros", label: "El negocio", main: false as const, icon: "store" as const },
] as const;

type MenuState = { open: boolean; setOpen: (value: boolean) => void; menuId: string };

const MenuContext = createContext<MenuState | null>(null);

function useMenu() {
  const value = useContext(MenuContext);
  if (!value) throw new Error("El menú de la tienda está fuera de su proveedor.");
  return value;
}

export function ShopMenu({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const menuId = useId();
  return <MenuContext.Provider value={{ open, setOpen, menuId }}>{children}</MenuContext.Provider>;
}

export function ShopMenuButton() {
  const { open, setOpen, menuId } = useMenu();
  return (
    <button className="nav-toggle" type="button" aria-expanded={open} aria-controls={menuId} onClick={() => setOpen(!open)}>
      {open ? <X aria-hidden="true" /> : <Menu aria-hidden="true" />}
      <span>{open ? "Cerrar" : "Menú"}</span>
    </button>
  );
}

export function ShopMenuLinks() {
  const path = usePathname();
  const { open, setOpen, menuId } = useMenu();
  const ref = useRef<HTMLElement>(null);
  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      setOpen(false);
      document.querySelector<HTMLButtonElement>(".shop .nav-toggle")?.focus();
    };
    document.addEventListener("keydown", onKey);
    const first = ref.current?.querySelector("a");
    if (first instanceof HTMLElement) first.focus();
    return () => document.removeEventListener("keydown", onKey);
  }, [open, setOpen]);

  return (
    <nav ref={ref} id={menuId} className={open ? "is-open" : undefined} aria-label="Navegación principal">
      {LINKS.map((link) => {
        const inFlow =
          link.href === "/catalogo"
            ? shopNavCatalogActive(path)
            : link.href === "/sobre-nosotros"
              ? shopNavBusinessActive(path)
              : path === link.href || path.startsWith(`${link.href}/`);
        const ariaCurrent = shopNavAriaCurrent(path, link.href);
        const className = [
          link.main ? "nav-main" : "nav-secondary",
          inFlow ? "is-active" : "",
        ]
          .filter(Boolean)
          .join(" ");
        return (
          <Link
            key={link.href}
            className={className}
            href={link.href}
            aria-current={ariaCurrent}
            onClick={() => setOpen(false)}
          >
            {link.icon === "grid" ? <LayoutGrid aria-hidden="true" size={16} strokeWidth={1.9} /> : null}
            {link.icon === "cart" ? <ShoppingBag aria-hidden="true" size={16} strokeWidth={1.9} /> : null}
            {link.icon === "store" ? <Store aria-hidden="true" size={16} strokeWidth={1.9} /> : null}
            <span>{link.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
