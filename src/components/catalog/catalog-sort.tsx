"use client";

type Props = {
  action?: string;
  current: string;
  hidden: Record<string, string | undefined>;
};

const OPTIONS = [
  { value: "", label: "Destacados" },
  { value: "recent", label: "Más recientes" },
  { value: "price-asc", label: "Menor precio" },
  { value: "price-desc", label: "Mayor precio" },
  { value: "name", label: "Nombre A–Z" },
] as const;

export function CatalogSortSelect({ action = "/catalogo", current, hidden }: Props) {
  return (
    <form
      className="catalog-sort-form"
      action={action}
      method="get"
      onChange={(event) => {
        const form = event.currentTarget;
        if (form instanceof HTMLFormElement) form.requestSubmit();
      }}
    >
      {Object.entries(hidden).map(([name, value]) =>
        value ? <input key={name} type="hidden" name={name} value={value} /> : null,
      )}
      <label className="catalog-sort-label">
        <span>Ordenar por</span>
        <select name="orden" defaultValue={current} aria-label="Ordenar por">
          {OPTIONS.map((option) => (
            <option key={option.value || "default"} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </label>
      <noscript>
        <button className="quiet" type="submit">
          Aplicar orden
        </button>
      </noscript>
    </form>
  );
}
