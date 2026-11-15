/** Dígitos crudos del valor parametrizado. */
export function phoneDigits(value: string): string {
  return value.replace(/\D/g, "");
}

/**
 * Normaliza a dígitos internacionales para tel:/wa.me.
 * Si vienen 10 dígitos (móvil CO típico), antepone el indicativo por defecto.
 */
export function internationalPhoneDigits(value: string, defaultCountry = "57"): string {
  const digits = phoneDigits(value);
  if (!digits) return "";
  if (digits.startsWith(defaultCountry) && digits.length >= defaultCountry.length + 10) return digits;
  if (digits.length === 10) return `${defaultCountry}${digits}`;
  return digits;
}

/** Visual público del número parametrizado, p. ej. +573213660046 */
export function formatPublicPhone(value: string): string {
  const digits = internationalPhoneDigits(value);
  return digits ? `+${digits}` : "";
}

export function telHref(value: string): string | null {
  const digits = internationalPhoneDigits(value);
  return digits ? `tel:+${digits}` : null;
}
