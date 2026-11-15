export function databaseUrl(): string | null {
  const value = process.env.DATABASE_URL?.trim() ?? "";
  if (!/^postgres(ql)?:\/\//i.test(value)) return null;
  return value;
}

export function authSecret(): Uint8Array | null {
  const value = process.env.AUTH_SECRET?.trim() ?? "";
  if (value.length < 32) return null;
  return new TextEncoder().encode(value);
}

export function cloudinaryEnv(): { cloudName: string; apiKey: string; apiSecret: string } | null {
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME?.trim() ?? "";
  const apiKey = process.env.CLOUDINARY_API_KEY?.trim() ?? "";
  const apiSecret = process.env.CLOUDINARY_API_SECRET?.trim() ?? "";
  if (!cloudName || !apiKey || !apiSecret) return null;
  return { cloudName, apiKey, apiSecret };
}

export function cronSecret(): string | null {
  const value = process.env.CRON_SECRET?.trim() ?? "";
  if (value.length < 16) return null;
  return value;
}
