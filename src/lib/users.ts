import { isRole, type Role } from "@/lib/permissions";

export type UserCard = {
  id: string;
  name: string;
  email: string;
  role: Role;
  active: boolean;
  lastLoginAt: string | null;
  mine: boolean;
};

export const ROLE_OPTIONS: { value: Role; label: string; hint: string }[] = [
  { value: "admin", label: "Administrador", hint: "Todo el panel, incluido usuarios y ajustes." },
  { value: "catalog", label: "Gestor de catálogo", hint: "Categorías, productos, atributos y multimedia." },
  { value: "marketing", label: "Marketing", hint: "Inicio, multimedia, SEO y lectura del catálogo." },
  { value: "commercial", label: "Asesor comercial", hint: "Cotizaciones y lectura del catálogo." },
];

export function roleLabel(role: string) {
  return ROLE_OPTIONS.find((item) => item.value === role)?.label ?? role;
}

export function roleHint(role: string) {
  return ROLE_OPTIONS.find((item) => item.value === role)?.hint ?? "";
}

export function userEmailProblem(value: string) {
  const email = value.trim().toLowerCase();
  if (!email) return "El correo es obligatorio.";
  if (email.length > 120) return "El correo es demasiado largo.";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return "Usa un correo con dominio, como ana@tienda.com.";
  return "";
}

export function userPasswordProblem(value: string, required: boolean) {
  const password = value.trim();
  if (!password) return required ? "La clave necesita 10 caracteres." : "";
  if (password.length < 10) return "La clave necesita 10 caracteres.";
  if (password.length > 72) return "La clave es demasiado larga.";
  if (!/[A-Za-zÁÉÍÓÚÜáéíóúüÑñ]/.test(password) || !/\d/.test(password)) {
    return "La clave necesita letras y al menos un número.";
  }
  return "";
}

export function userPasswordConfirmProblem(password: string, confirm: string) {
  if (!password.trim()) return "";
  if (password.trim() !== confirm.trim()) return "Las claves no coinciden.";
  return "";
}

export function userNameProblem(value: string) {
  const name = value.trim();
  if (name.length < 2) return "El nombre necesita al menos 2 caracteres.";
  if (name.length > 80) return "El nombre es demasiado largo.";
  return "";
}

export function userRoleProblem(value: string) {
  if (!isRole(value)) return "Ese rol no existe.";
  return "";
}

export function userSelfDeactivateProblem(actorId: string, targetId: string, active: boolean) {
  if (actorId === targetId && !active) return "No puedes desactivar tu propia cuenta.";
  return "";
}

export function userLastAdminProblem(input: {
  currentRole: string;
  currentActive: boolean;
  nextRole: string;
  nextActive: boolean;
  otherActiveAdmins: number;
}) {
  const wasAdmin = input.currentRole === "admin" && input.currentActive;
  const staysAdmin = input.nextActive && input.nextRole === "admin";
  if (!wasAdmin || staysAdmin) return "";
  if (input.otherActiveAdmins < 1) return "Tiene que quedar al menos un administrador activo.";
  return "";
}

export function userSaveMessage(input: { name: string; creating: boolean; active: boolean; passwordChanged: boolean }) {
  if (input.creating) return input.active ? `${input.name} ya puede entrar al panel.` : `${input.name} quedó creado e inactivo.`;
  if (input.passwordChanged) return `${input.name} quedó actualizado y la clave nueva ya sirve.`;
  return input.active ? `${input.name} quedó actualizado.` : `${input.name} quedó inactivo y no puede entrar.`;
}

export function isUniqueEmailError(error: unknown) {
  const code = typeof error === "object" && error && "code" in error ? String(error.code) : "";
  if (code === "23505") return true;
  const message = error instanceof Error ? error.message : String(error ?? "");
  return /unique|users_email|duplicate key/i.test(message);
}

export function passwordSessionStamp(passwordHash: string) {
  return passwordHash.slice(-24);
}

export function sessionPasswordStale(tokenStamp: unknown, passwordHash: string) {
  if (typeof tokenStamp !== "string" || !tokenStamp) return false;
  return tokenStamp !== passwordSessionStamp(passwordHash);
}

export function userLastAccess(value: string | null, now = new Date()) {
  if (!value) return "Aún no ha entrado";
  const at = new Date(value);
  if (Number.isNaN(at.getTime())) return "Aún no ha entrado";
  const minutes = Math.floor((now.getTime() - at.getTime()) / 60000);
  if (minutes < 1) return "Activo hace un momento";
  if (minutes < 60) return `Entró hace ${minutes} min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `Entró hace ${hours} h`;
  const days = Math.floor(hours / 24);
  if (days < 15) return `Entró hace ${days} día${days === 1 ? "" : "s"}`;
  return `Último acceso ${at.toLocaleString("es-CO")}`;
}

export function userMatchesFilter(user: UserCard, query: string, status: "all" | "active" | "inactive", role: "all" | Role) {
  if (status === "active" && !user.active) return false;
  if (status === "inactive" && user.active) return false;
  if (role !== "all" && user.role !== role) return false;
  const needle = query.trim().toLowerCase();
  if (!needle) return true;
  return user.name.toLowerCase().includes(needle) || user.email.toLowerCase().includes(needle) || roleLabel(user.role).toLowerCase().includes(needle);
}
