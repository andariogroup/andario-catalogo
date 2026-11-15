export const QUOTE_STATES = ["nueva", "en-gestion", "atendida", "cerrada"] as const;
export type QuoteState = (typeof QUOTE_STATES)[number];

export function isQuoteState(value: string): value is QuoteState {
  return (QUOTE_STATES as readonly string[]).includes(value);
}

export function quoteReference(now = new Date(), salt = ""): string {
  const year = now.getFullYear();
  const noise = (salt || Math.random().toString(36)).replace(/[^a-z0-9]/gi, "").slice(0, 6).toUpperCase().padEnd(6, "X");
  return `AC-${year}-${noise}`;
}

export function quoteStateLabel(state: QuoteState): string {
  if (state === "nueva") return "Nueva";
  if (state === "en-gestion") return "En gestión";
  if (state === "atendida") return "Atendida";
  return "Cerrada";
}

export function quoteIsOpen(state: QuoteState): boolean {
  return state === "nueva" || state === "en-gestion";
}

export const QUOTE_WAIT_DAYS = [2, 7, 15] as const;

export function quoteAgeDays(createdAt: Date, now = new Date()): number {
  return Math.floor(Math.max(0, now.getTime() - createdAt.getTime()) / 86_400_000);
}

export function quoteUnmanaged(status: QuoteState, createdAt: Date, days: number, now = new Date()): boolean {
  return status === "nueva" && quoteAgeDays(createdAt, now) >= days;
}

export function quoteManagerLabel(email: string, names: ReadonlyMap<string, string>, status: QuoteState): string {
  if (!email) return status === "nueva" ? "Nadie la ha tomado" : "Sin responsable";
  const name = names.get(email.toLowerCase());
  return name ? `La gestiona ${name}` : `La gestiona ${email}`;
}

export type QuoteStatusChoice = "open" | QuoteState;

export function quoteMatchesStatuses(status: QuoteState, selected: readonly QuoteStatusChoice[]): boolean {
  if (!selected.length) return true;
  return selected.some((item) => item === "open" ? quoteIsOpen(status) : item === status);
}

const OPTION_ID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function readableVariant(stored: string, labels: ReadonlyMap<string, string>): string {
  const parts = stored.split(".").map((part) => part.trim()).filter(Boolean);
  if (!parts.length) return "";
  if (!parts.every((part) => OPTION_ID.test(part))) return stored;
  const names = parts.map((part) => labels.get(part) ?? "");
  if (names.some((name) => !name)) return "Variante ya no está en el catálogo";
  return names.join(" · ");
}

export function quoteWhen(value: Date): string {
  return new Intl.DateTimeFormat("es-CO", { dateStyle: "medium", timeStyle: "short", timeZone: "America/Bogota" }).format(value);
}

export function quoteAgo(value: Date, now = new Date()): string {
  const minutes = Math.max(0, Math.round((now.getTime() - value.getTime()) / 60000));
  if (minutes < 1) return "Ahora";
  if (minutes < 60) return minutes === 1 ? "Hace 1 minuto" : `Hace ${minutes} minutos`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return hours === 1 ? "Hace 1 hora" : `Hace ${hours} horas`;
  const days = Math.round(hours / 24);
  return days === 1 ? "Hace 1 día" : `Hace ${days} días`;
}

export function quoteNext(state: QuoteState): { status: QuoteState; label: string } {
  if (state === "nueva") return { status: "en-gestion", label: "Ya le escribí" };
  if (state === "en-gestion") return { status: "atendida", label: "Ya quedó respondida" };
  if (state === "atendida") return { status: "cerrada", label: "Cerrar solicitud" };
  return { status: "en-gestion", label: "Volver a abrir" };
}

export function quoteStepHint(state: QuoteState): string {
  if (state === "nueva") return "Acaba de llegar. Escríbele por WhatsApp y, cuando lo hagas, márcala en gestión.";
  if (state === "en-gestion") return "La estás atendiendo. Cuando termines la respuesta, márcala atendida.";
  if (state === "atendida") return "Ya respondiste. Ciérrala si la conversación terminó.";
  return "Terminó. Ábrela de nuevo si vuelven a escribir.";
}

export function byArrival<T extends { arrived: number }>(items: T[]): T[] {
  return [...items].sort((left, right) => right.arrived - left.arrived);
}

export function quotePhoneDigits(phone: string): string {
  return phone.replace(/\D/g, "");
}

export function quoteEmailOk(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

export function quoteContactProblem(phone: string, email: string): string {
  const digits = quotePhoneDigits(phone);
  const mail = email.trim();
  if (digits && (digits.length < 10 || digits.length > 15)) return "El WhatsApp necesita entre 10 y 15 dígitos.";
  if (mail && !quoteEmailOk(mail)) return "Revisa el correo.";
  if (digits.length < 10 && !quoteEmailOk(mail)) return "Deja un WhatsApp o un correo.";
  return "";
}

export function quoteOrigin(value: string): string {
  const path = value.trim();
  if (!path.startsWith("/") || path.startsWith("//") || /[\s?#\\]/.test(path)) return "";
  return path.slice(0, 180);
}

export function quoteLineProblem(input: { productName: string; productAvailability: string; variantAvailability: string | null; hasVariants: boolean; variantId: string }): string {
  if (input.productAvailability === "sold_out" || input.variantAvailability === "sold_out") return `${input.productName} está agotado.`;
  if (input.hasVariants && !input.variantId) return `Elige la variante de ${input.productName} antes de enviar la solicitud.`;
  return "";
}

export function quoteStepRecord(action: string): string {
  const status = action.startsWith("paso-cotizacion-") ? action.slice("paso-cotizacion-".length) : "";
  if (!isQuoteState(status)) return "";
  return `Pasó a ${quoteStateLabel(status)}`;
}

export function quoteUpdateMessage(changed: boolean, hasNote: boolean): string {
  if (!changed && !hasNote) return "No hay nada nuevo para guardar.";
  if (!changed) return "La nota quedó guardada.";
  if (!hasNote) return "El estado quedó guardado.";
  return "El estado quedó guardado y la nota también.";
}

export function retentionCutoff(days: number, now = new Date()): Date | null {
  if (!Number.isInteger(days) || days < 1 || days > 3650) return null;
  return new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
}

export function quoteSummary(total: number, open: number) {
  if (!total) return "Todavía no hay solicitudes.";
  const count = total === 1 ? "1 solicitud" : `${total} solicitudes`;
  if (!open) return `${count}.`;
  const pending = open === 1 ? "1 sigue abierta" : `${open} siguen abiertas`;
  return `${count}. ${pending}.`;
}

export type QuoteCard = {
  id: string;
  reference: string;
  name: string;
  phone: string;
  city: string;
  status: QuoteState;
  statusLabel: string;
  open: boolean;
  when: string;
  ago: string;
  arrived: number;
  pieces: number;
  summary: string;
  unmanaged: boolean;
  ageDays: number;
  manager: string;
};
