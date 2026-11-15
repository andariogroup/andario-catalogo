import { createHash } from "node:crypto";

export type ImageFormat = "png" | "jpg" | "webp" | "ico";

export function detectImage(bytes: Uint8Array): ImageFormat | null {
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return "jpg";
  if (bytes.length >= 8 && bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47) return "png";
  if (bytes.length >= 12 && bytes[0] === 0x52 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x46 && bytes[8] === 0x57 && bytes[9] === 0x45 && bytes[10] === 0x42 && bytes[11] === 0x50) return "webp";
  if (bytes.length >= 4 && bytes[0] === 0 && bytes[1] === 0 && bytes[2] === 1 && bytes[3] === 0) return "ico";
  return null;
}

export function inspectUpload(bytes: Uint8Array, kind: "image" | "video"): string | null {
  if (bytes.byteLength === 0) return "Elige un archivo.";
  if (kind === "image") {
    if (bytes.byteLength > 5 * 1024 * 1024) return "La imagen pasa de 5 MB.";
    if (!detectImage(bytes) || detectImage(bytes) === "ico") return "La imagen tiene que ser png, jpg o webp.";
    return null;
  }
  if (bytes.byteLength > 8 * 1024 * 1024) return "El video pasa de 8 MB.";
  return null;
}

export function signCloudinary(params: Record<string, string | number>, secret: string): string {
  const payload = Object.keys(params).sort().map((key) => `${key}=${params[key]}`).join("&");
  return createHash("sha1").update(payload + secret).digest("hex");
}

export function cloudinaryTarget(value: string, cloudName: string): { resource: "image" | "video"; publicId: string } | null {
  if (!isOurCloudinaryUrl(value, cloudName)) return null;
  const parts = new URL(value).pathname.split("/").filter(Boolean);
  const resource = parts[1] === "video" ? "video" : "image";
  const rest = parts.slice(3);
  if (rest[0] && /^v\d+$/.test(rest[0])) rest.shift();
  const publicId = rest.join("/").replace(/\.[a-z0-9]+$/i, "");
  if (!publicId.startsWith("andario/")) return null;
  return { resource, publicId };
}

export function isOurCloudinaryUrl(value: string, cloudName: string): boolean {
  if (!/^[a-z0-9_-]{1,80}$/i.test(cloudName)) return false;
  try {
    const url = new URL(value);
    if (url.protocol !== "https:" || url.username || url.password || url.hostname !== "res.cloudinary.com") return false;
    const parts = url.pathname.split("/");
    return parts[1] === cloudName && (parts[2] === "image" || parts[2] === "video") && parts[3] === "upload";
  } catch {
    return false;
  }
}

export function safeHex(value: string, fallback: string): string {
  return /^#[0-9a-fA-F]{6}$/.test(value.trim()) ? value.trim() : fallback;
}

export type MediaDeliveryOptions = {
  width?: number;
  height?: number;
  /** crop mode Cloudinary, p. ej. fill | fit | limit */
  crop?: "fill" | "fit" | "limit" | "scale";
  quality?: "auto" | number;
};

/**
 * Inserta transformaciones de entrega en URLs Cloudinary `/upload/`.
 * No altera URLs ajenas ni firmadas; conserva transforms existentes (p. ej. e_trim).
 */
export function mediaDeliveryUrl(value: string, options: MediaDeliveryOptions = {}): string {
  const raw = value.trim();
  if (!raw) return raw;
  try {
    const url = new URL(raw);
    if (url.protocol !== "https:" || url.hostname !== "res.cloudinary.com") return raw;
    const marker = "/upload/";
    const index = url.pathname.indexOf(marker);
    if (index < 0) return raw;
    const head = url.pathname.slice(0, index + marker.length);
    const tail = url.pathname.slice(index + marker.length);
    if (!tail || tail.includes("?")) return raw;
    const parts = ["f_auto", `q_${options.quality ?? "auto"}`];
    if (options.width && Number.isFinite(options.width) && options.width > 0) {
      parts.push(`w_${Math.min(2400, Math.round(options.width))}`);
    }
    if (options.height && Number.isFinite(options.height) && options.height > 0) {
      parts.push(`h_${Math.min(2400, Math.round(options.height))}`);
    }
    if (options.crop) parts.push(`c_${options.crop}`);
    // Evita duplicar si ya hay f_auto/q_auto al inicio del path.
    if (/^(?:[^/]+,)*f_auto(?:$|,)/.test(tail) || /^(?:[^/]+,)*q_auto(?:$|,)/.test(tail)) {
      return raw;
    }
    url.pathname = `${head}${parts.join(",")}/${tail}`;
    return url.toString();
  } catch {
    return raw;
  }
}

