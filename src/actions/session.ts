"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { checkPassword, clearSession, startSession } from "@/lib/auth";
import { getDb, recordAudit, takeAttempt } from "@/lib/db";
import { authSecret } from "@/lib/env";
import type { FormState } from "@/lib/form";
import { attemptKey, clientAddress, LOGIN_LIMIT, LOGIN_WINDOW_MS, publicError } from "@/lib/security";

export async function loginAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const secret = authSecret();
  if (!getDb()) return { error: "No hay base de datos.", ok: "" };
  if (!secret) return { error: publicError("Falta AUTH_SECRET.", process.env.NODE_ENV === "production", "No pude entrar. Intenta más tarde."), ok: "" };
  const email = String(formData.get("email") ?? "");
  const password = String(formData.get("password") ?? "");
  const address = clientAddress((await headers()).get("x-forwarded-for"));
  const allowed = await takeAttempt(attemptKey(new TextDecoder().decode(secret), "login", address, email), LOGIN_LIMIT, LOGIN_WINDOW_MS);
  if (!allowed) return { error: "Demasiados intentos. Espera unos minutos.", ok: "" };
  const found = await checkPassword(email, password);
  if (!found) return { error: "Correo o clave incorrectos.", ok: "" };
  await startSession(found.user, found.passwordHash);
  await recordAudit(found.user.email, "entro", "session");
  redirect("/admin");
}

export async function logoutAction() {
  const { readSession } = await import("@/lib/auth");
  const user = await readSession();
  if (user) await recordAudit(user.email, "salio", "session");
  await clearSession();
  redirect("/admin/login");
}
