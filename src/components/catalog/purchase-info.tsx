import Link from "next/link";
import { purchaseInfoSections, type PurchaseSection } from "@/lib/purchase-info";

function PurchaseIcon({ icon }: { icon: PurchaseSection["icon"] }) {
  if (icon === "return") {
    return (
      <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" focusable="false">
        <path
          fill="none"
          stroke="currentColor"
          strokeWidth="1.7"
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M4 8h11a4 4 0 0 1 0 8H8M4 8l3-3M4 8l3 3"
        />
      </svg>
    );
  }
  if (icon === "access") {
    return (
      <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" focusable="false">
        <path
          fill="none"
          stroke="currentColor"
          strokeWidth="1.7"
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M8 12h8M13 8l4 4-4 4M6 5h5a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H6"
        />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" focusable="false">
      <path
        fill="none"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M3 7h11v8H3zM14 10h4l3 3v2h-7M7 18.5a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3zm10 0a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3z"
      />
    </svg>
  );
}

export function PurchaseInfo({
  kind,
  policies,
  productPath,
}: {
  kind: string;
  policies: string[];
  productPath: string;
}) {
  const sections = purchaseInfoSections({ kind, policies, productPath });
  if (!sections.length) return null;
  return (
    <section className="ficha-purchase" aria-labelledby="ficha-purchase-title">
      <h2 id="ficha-purchase-title">Información para tu compra</h2>
      <div className="ficha-purchase-list">
        {sections.map((section) => (
          <details key={section.id} className="ficha-purchase-item" name="ficha-compra">
            <summary aria-controls={`ficha-purchase-${section.id}`}>
              <span className="ficha-purchase-icon">
                <PurchaseIcon icon={section.icon} />
              </span>
              <span className="ficha-purchase-label">{section.title}</span>
              <span className="ficha-purchase-chevron" aria-hidden="true" />
            </summary>
            <div className="ficha-purchase-body" id={`ficha-purchase-${section.id}`}>
              <p>{section.summary}</p>
              <Link href={section.href}>Ver la política completa</Link>
            </div>
          </details>
        ))}
      </div>
    </section>
  );
}
