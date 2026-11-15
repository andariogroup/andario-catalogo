"use server";

import bcrypt from "bcryptjs";
import { headers } from "next/headers";
import { and, eq, ne, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { requirePermission } from "@/lib/auth";
import { getDb, recordAudit, takeAttempt } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { authSecret } from "@/lib/env";
import { checked, text, type FormState } from "@/lib/form";
import { attemptKey, clientAddress, LOGIN_WINDOW_MS } from "@/lib/security";
import {
  isUniqueEmailError,
  userEmailProblem,
  userLastAdminProblem,
  userNameProblem,
  userPasswordConfirmProblem,
  userPasswordProblem,
  userRoleProblem,
  userSaveMessage,
  userSelfDeactivateProblem,
} from "@/lib/users";

export async function saveUserAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const actor = await requirePermission("users", "manage");
  const secret = authSecret();
  if (secret) {
    const address = clientAddress((await headers()).get("x-forwarded-for"));
    const allowed = await takeAttempt(attemptKey(new TextDecoder().decode(secret), "users", address, actor.email), 30, LOGIN_WINDOW_MS);
    if (!allowed) return { error: "Demasiados cambios seguidos. Espera un momento.", ok: "" };
  }

  const db = getDb();
  if (!db) return { error: "No hay base de datos.", ok: "" };

  const id = text(formData, "id");
  const name = text(formData, "name").slice(0, 80);
  const email = text(formData, "email").toLowerCase().slice(0, 120);
  const role = text(formData, "role");
  const active = checked(formData, "active");
  const password = text(formData, "password");
  const confirm = text(formData, "passwordConfirm");

  const nameProblem = userNameProblem(name);
  if (nameProblem) return { error: nameProblem, ok: "" };
  const emailProblem = userEmailProblem(email);
  if (emailProblem) return { error: emailProblem, ok: "" };
  const roleProblem = userRoleProblem(role);
  if (roleProblem) return { error: roleProblem, ok: "" };

  const creating = !id;
  const passwordProblem = userPasswordProblem(password, creating);
  if (passwordProblem) return { error: passwordProblem, ok: "" };
  const confirmProblem = userPasswordConfirmProblem(password, confirm);
  if (confirmProblem) return { error: confirmProblem, ok: "" };

  let problem = "";
  let ok = "";

  try {
    await db.transaction(async (tx) => {
      if (id) {
        await tx.execute(sql`select id from users where id = ${id} for update`);
      }

      const [current] = id
        ? await tx.select().from(users).where(eq(users.id, id)).limit(1)
        : [];

      if (id && !current) {
        problem = "No encontré ese usuario.";
        throw new Error("stop");
      }

      if (current) {
        const selfProblem = userSelfDeactivateProblem(actor.id, current.id, active);
        if (selfProblem) {
          problem = selfProblem;
          throw new Error("stop");
        }

        const leavingAdmin = current.role === "admin" && current.active && (!active || role !== "admin");
        if (leavingAdmin) {
          await tx.execute(sql`select id from users where role = 'admin' and active = true for update`);
          const [count] = await tx
            .select({ value: sql<number>`count(*)::int` })
            .from(users)
            .where(and(eq(users.role, "admin"), eq(users.active, true), ne(users.id, current.id)));
          const lastProblem = userLastAdminProblem({
            currentRole: current.role,
            currentActive: current.active,
            nextRole: role,
            nextActive: active,
            otherActiveAdmins: count?.value ?? 0,
          });
          if (lastProblem) {
            problem = lastProblem;
            throw new Error("stop");
          }
        }

        const [clash] = await tx.select({ id: users.id }).from(users).where(eq(users.email, email)).limit(1);
        if (clash && clash.id !== current.id) {
          problem = "Ese correo ya está en uso.";
          throw new Error("stop");
        }

        try {
          await tx
            .update(users)
            .set({
              name,
              email,
              role,
              active,
              updatedAt: new Date(),
              ...(password ? { passwordHash: await bcrypt.hash(password, 12) } : {}),
            })
            .where(eq(users.id, current.id));
        } catch (error) {
          if (isUniqueEmailError(error)) {
            problem = "Ese correo ya está en uso.";
            throw new Error("stop");
          }
          throw error;
        }

        ok = userSaveMessage({ name, creating: false, active, passwordChanged: Boolean(password) });
        return;
      }

      const [clash] = await tx.select({ id: users.id }).from(users).where(eq(users.email, email)).limit(1);
      if (clash) {
        problem = "Ese correo ya está en uso.";
        throw new Error("stop");
      }

      try {
        await tx.insert(users).values({
          id: crypto.randomUUID(),
          name,
          email,
          role,
          active,
          passwordHash: await bcrypt.hash(password, 12),
        });
      } catch (error) {
        if (isUniqueEmailError(error)) {
          problem = "Ese correo ya está en uso.";
          throw new Error("stop");
        }
        throw error;
      }

      ok = userSaveMessage({ name, creating: true, active, passwordChanged: true });
    });
  } catch (error) {
    if (problem) return { error: problem, ok: "" };
    if (isUniqueEmailError(error)) return { error: "Ese correo ya está en uso.", ok: "" };
    throw error;
  }

  revalidatePath("/admin/usuarios");
  await recordAudit(actor.email, creating ? "creo-usuario" : "guardo-usuario", email);
  return { error: "", ok };
}
