const MAX = 999_999_999;

export function parsePesos(value: string): number | null {
  const clean = value.trim().replace(/\s/g, "");
  if (!clean) return null;
  const digits = clean.replace(/\./g, "");
  if (!/^[1-9]\d{0,8}$/.test(digits) && digits !== "0") return null;
  if (!/^\d{1,3}(\.\d{3})*$|^\d+$/.test(clean)) return null;
  const amount = Number(digits);
  if (!Number.isSafeInteger(amount) || amount <= 0 || amount > MAX) return null;
  return amount;
}

export function formatPesos(amount: number | null | undefined, symbol = "$"): string {
  if (amount == null || !Number.isFinite(amount)) return "Consultar";
  const formatted = new Intl.NumberFormat("es-CO", { maximumFractionDigits: 0 }).format(amount);
  return `${symbol}${formatted}`;
}

export function pesosFromDb(value: string | null): number | null {
  if (value == null || value === "") return null;
  const amount = Number(value);
  if (!Number.isSafeInteger(amount) || amount < 0 || amount > MAX) return null;
  return amount;
}
