import "server-only";

import { cloudinaryEnv } from "@/lib/env";
import { cloudinaryTarget, inspectUpload, isOurCloudinaryUrl, signCloudinary } from "@/lib/images";
import { publicError } from "@/lib/security";

export async function uploadAsset(bytes: Uint8Array, kind: "image" | "video"): Promise<{ ok: true; url: string; bytes: number } | { ok: false; error: string }> {
  const problem = inspectUpload(bytes, kind);
  if (problem) return { ok: false, error: problem };
  const config = cloudinaryEnv();
  if (!config) return { ok: false, error: publicError("Falta Cloudinary.", process.env.NODE_ENV === "production", "No pude subir el archivo.") };
  const timestamp = Math.floor(Date.now() / 1000);
  const publicId = `andario/media/${crypto.randomUUID()}`;
  const params = { overwrite: "false", public_id: publicId, timestamp };
  const body = new FormData();
  body.append("file", new Blob([Uint8Array.from(bytes)]), "archivo");
  body.append("api_key", config.apiKey);
  body.append("signature", signCloudinary(params, config.apiSecret));
  for (const [key, value] of Object.entries(params)) body.append(key, String(value));
  const resource = kind === "video" ? "video" : "image";
  try {
    const response = await fetch(`https://api.cloudinary.com/v1_1/${config.cloudName}/${resource}/upload`, { method: "POST", body, signal: AbortSignal.timeout(20_000) });
    if (!response.ok) return { ok: false, error: "El repositorio no recibió el archivo." };
    const payload = (await response.json()) as { secure_url?: unknown };
    const url = typeof payload.secure_url === "string" ? payload.secure_url : "";
    if (!isOurCloudinaryUrl(url, config.cloudName)) return { ok: false, error: "La respuesta no era de este repositorio." };
    return { ok: true, url, bytes: bytes.byteLength };
  } catch {
    return { ok: false, error: publicError("Cloudinary no respondió.", process.env.NODE_ENV === "production", "No pude subir el archivo.") };
  }
}

export async function destroyAsset(url: string): Promise<boolean> {
  const config = cloudinaryEnv();
  if (!config) return false;
  const target = cloudinaryTarget(url, config.cloudName);
  if (!target) return false;
  const timestamp = Math.floor(Date.now() / 1000);
  const params = { invalidate: "true", public_id: target.publicId, timestamp };
  const body = new FormData();
  body.append("public_id", target.publicId);
  body.append("invalidate", "true");
  body.append("timestamp", String(timestamp));
  body.append("api_key", config.apiKey);
  body.append("signature", signCloudinary(params, config.apiSecret));
  try {
    const response = await fetch(`https://api.cloudinary.com/v1_1/${config.cloudName}/${target.resource}/destroy`, { method: "POST", body, signal: AbortSignal.timeout(20_000) });
    if (!response.ok) return false;
    const payload = (await response.json()) as { result?: unknown };
    return payload.result === "ok" || payload.result === "not found";
  } catch {
    return false;
  }
}
