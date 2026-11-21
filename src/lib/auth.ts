import "server-only";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import bcrypt from "bcryptjs";
import { SignJWT, jwtVerify } from "jose";
import { eq } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { authSecret } from "@/lib/env";
import { SESSION_COOKIE } from "@/lib/session-cookie";
import { allows, isRole, type Access, type AppModule, type Role } from "@/lib/permissions";
import { passwordSessionStamp, sessionPasswordStale } from "@/lib/users";

const COOKIE = SESSION_COOKIE;
const DUMMY = bcrypt.hashSync("andario-dummy-not-a-password", 12);

export type SessionUser = { id: string; name: string; email: string; role: Role };

export async function readSession(): Promise<SessionUser | null> {
  const secret = authSecret();
  const db = getDb();
  if (!secret || !db) return null;
  const token = (await cookies()).get(COOKIE)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secret);
    const id = typeof payload.sub === "string" ? payload.sub : "";
    const rows = await db.select().from(users).where(eq(users.id, id)).limit(1);
    const user = rows[0];
    if (!user || !user.active || !isRole(user.role)) return null;
    if (sessionPasswordStale(payload.ph, user.passwordHash)) return null;
    return { id: user.id, name: user.name, email: user.email, role: user.role };
  } catch {
    return null;
  }
}

export async function startSession(user: SessionUser, passwordHash: string) {
  const secret = authSecret();
  if (!secret) return;
  const token = await new SignJWT({ role: user.role, ph: passwordSessionStamp(passwordHash) }).setProtectedHeader({ alg: "HS256" }).setSubject(user.id).setIssuedAt().setExpirationTime("12h").sign(secret);
  (await cookies()).set(COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 12,
  });
}

export async function clearSession() {
  (await cookies()).delete(COOKIE);
}

export async function checkPassword(email: string, password: string): Promise<{ user: SessionUser; passwordHash: string } | null> {
  const db = getDb();
  if (!db) return null;
  const rows = await db.select().from(users).where(eq(users.email, email.trim().toLowerCase())).limit(1);
  const user = rows[0];
  const hash = user?.passwordHash ?? DUMMY;
  const match = await bcrypt.compare(password, hash);
  if (!user || !user.active || !match || !isRole(user.role)) return null;
  await db.update(users).set({ lastLoginAt: new Date() }).where(eq(users.id, user.id));
  return {
    user: { id: user.id, name: user.name, email: user.email, role: user.role },
    passwordHash: user.passwordHash,
  };
}

export async function requireUser(): Promise<SessionUser> {
  const user = await readSession();
  if (!user) redirect("/admin/login");
  return user;
}

export async function requirePermission(module: AppModule, needed: Access): Promise<SessionUser> {
  const user = await requireUser();
  if (!allows(user.role, module, needed)) redirect("/admin/sin-acceso");
  return user;
}
