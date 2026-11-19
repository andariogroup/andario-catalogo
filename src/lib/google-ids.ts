/** Validadores de identificadores Google (sin llamadas externas). */

export function normalizeGa4Id(value: string) {
  return value.trim().toUpperCase();
}

export function ga4IdProblem(value: string) {
  const id = normalizeGa4Id(value);
  if (!id) return "";
  if (!/^G-[A-Z0-9]{6,12}$/.test(id)) return "Usa un ID de medición con formato G-XXXXXXXX.";
  return "";
}

export function normalizeGtmId(value: string) {
  return value.trim().toUpperCase();
}

export function gtmIdProblem(value: string) {
  const id = normalizeGtmId(value);
  if (!id) return "";
  if (!/^GTM-[A-Z0-9]{4,12}$/.test(id)) return "Usa un ID de contenedor con formato GTM-XXXXXXX.";
  return "";
}

export function ga4PropertyIdProblem(value: string) {
  const id = value.trim();
  if (!id) return "";
  if (!/^\d{6,15}$/.test(id)) return "El ID numérico de propiedad solo admite dígitos.";
  return "";
}

export function searchConsolePropertyFromOrigin(origin: string) {
  try {
    const host = new URL(origin).hostname.replace(/^www\./i, "").toLowerCase();
    if (!host || host === "localhost") return "";
    return `sc-domain:${host}`;
  } catch {
    return "";
  }
}

export function apexHostFromOrigin(origin: string) {
  try {
    return new URL(origin).hostname.replace(/^www\./i, "").toLowerCase();
  } catch {
    return "";
  }
}

/** Solo producción Vercel: Preview y desarrollo no miden en Google real. */
export function isGoogleMeasurementEnv() {
  return process.env.VERCEL_ENV === "production";
}
