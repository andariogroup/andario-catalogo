import { slugify } from "@/lib/slug";

export type PolicyBlock =
  | { type: "h2"; id: string; text: string }
  | { type: "p"; text: string }
  | { type: "ul"; items: string[] }
  | { type: "ol"; items: string[] };

const UNORDERED = /^[-*•]\s+(.+)$/;
const ORDERED = /^\d+[.)]\s+(.+)$/;

function isHeading(value: string) {
  const line = value.trim();
  if (!line || line.includes("\n") || line.length > 90) return false;
  if (/^#{1,3}\s+\S/.test(line)) return true;
  return /^\d{1,2}(?:\.\d{1,2})?\.\s+\S/.test(line) && !/[.!?]$/.test(line);
}

function headingText(value: string) {
  return value.trim().replace(/^#{1,3}\s+/, "");
}

function headingId(text: string, used: Set<string>) {
  const base = slugify(text.replace(/^\d+(?:\.\d+)?\.\s+/, "")) || "seccion";
  let id = base;
  let n = 2;
  while (used.has(id)) {
    id = `${base}-${n}`;
    n += 1;
  }
  used.add(id);
  return id;
}

/** Presenta el documento publicado. No reescribe cláusulas ni inventa secciones. */
export function policyDocument(body: string): { blocks: PolicyBlock[]; headings: { id: string; text: string }[] } {
  const text = body.replace(/\r\n/g, "\n").trim();
  if (!text) return { blocks: [], headings: [] };
  const blocks: PolicyBlock[] = [];
  const headings: { id: string; text: string }[] = [];
  const used = new Set<string>();
  for (const chunk of text.split(/\n{2,}/)) {
    const lines = chunk.split("\n").map((line) => line.trim()).filter(Boolean);
    if (!lines.length) continue;
    if (lines.length === 1 && isHeading(lines[0])) {
      const label = headingText(lines[0]);
      const id = headingId(label, used);
      blocks.push({ type: "h2", id, text: label });
      headings.push({ id, text: label });
      continue;
    }
    if (lines.every((line) => UNORDERED.test(line))) {
      blocks.push({ type: "ul", items: lines.map((line) => line.replace(UNORDERED, "$1")) });
      continue;
    }
    if (lines.every((line) => ORDERED.test(line))) {
      blocks.push({ type: "ol", items: lines.map((line) => line.replace(ORDERED, "$1")) });
      continue;
    }
    blocks.push({ type: "p", text: lines.join("\n") });
  }
  return { blocks, headings: headings.length >= 3 ? headings : [] };
}
