"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { Search, X } from "lucide-react";

export function HeaderSearch() {
  const params = useSearchParams();
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const current = params.get("q")?.trim() ?? "";
  const [value, setValue] = useState(current);

  useEffect(() => {
    setValue(current);
  }, [current]);

  function clearSearch() {
    const next = new URLSearchParams(params.toString());
    next.delete("q");
    next.delete("pagina");
    const text = next.toString();
    startTransition(() => {
      router.push(text ? `/catalogo?${text}` : "/catalogo");
    });
  }

  return (
    <form className="search" action="/catalogo" role="search" aria-busy={pending || undefined}>
      <Search aria-hidden="true" />
      <label className="visually-hidden" htmlFor="shop-search">
        Buscar en el catálogo
      </label>
      <input
        id="shop-search"
        name="q"
        value={value}
        onChange={(event) => setValue(event.target.value)}
        placeholder="Buscar productos..."
        autoComplete="off"
        enterKeyHint="search"
      />
      {value ? (
        <button className="search-clear" type="button" onClick={clearSearch} aria-label="Limpiar búsqueda">
          <X aria-hidden="true" />
        </button>
      ) : null}
    </form>
  );
}
