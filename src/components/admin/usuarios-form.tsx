"use client";

import { useEffect, useId, useState, useSyncExternalStore } from "react";
import { saveUserAction } from "@/actions/users";
import { BoundForm } from "@/components/admin/form";
import {
  ROLE_OPTIONS,
  roleHint,
  roleLabel,
  userLastAccess,
  userMatchesFilter,
  type UserCard,
} from "@/lib/users";
import type { Role } from "@/lib/permissions";

// La hora solo existe en el navegador; en el servidor es null para que la hidratación coincida.
const subscribeNever = () => () => {};
const minuteSnapshot = () => Math.floor(Date.now() / 60_000) * 60_000;
const serverSnapshot = () => null;

type StatusFilter = "all" | "active" | "inactive";
type RoleFilter = "all" | Role;

function initialOf(name: string) {
  return name.trim().charAt(0).toUpperCase() || "?";
}

export function UsersStudio({ users, currentUserId }: { users: UserCard[]; currentUserId: string }) {
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<StatusFilter>("all");
  const [role, setRole] = useState<RoleFilter>("all");
  const [openId, setOpenId] = useState<string | null>(null);
  const [inviting, setInviting] = useState(false);
  const [inviteRole, setInviteRole] = useState<Role>("commercial");
  const [flash, setFlash] = useState("");
  const nowMs = useSyncExternalStore(subscribeNever, minuteSnapshot, serverSnapshot);
  const now = nowMs === null ? null : new Date(nowMs);
  const inviteTriggerId = useId();

  useEffect(() => {
    if (!flash) return;
    const timer = window.setTimeout(() => setFlash(""), 6000);
    return () => window.clearTimeout(timer);
  }, [flash]);

  const visible = users.filter((user) => userMatchesFilter(user, query, status, role));
  const activeCount = users.filter((user) => user.active).length;
  const summary =
    users.length === 0
      ? "Todavía no hay nadie en el equipo."
      : activeCount === users.length
        ? `${users.length} ${users.length === 1 ? "persona" : "personas"} · todas pueden entrar`
        : `${users.length} ${users.length === 1 ? "persona" : "personas"} · ${activeCount} activas · ${users.length - activeCount} sin acceso`;

  function toggle(id: string) {
    setInviting(false);
    setOpenId((current) => (current === id ? null : id));
  }

  function startInvite() {
    setOpenId(null);
    setInviting(true);
    setInviteRole("commercial");
  }

  function remember(message: string) {
    setFlash(message);
  }

  return (
    <div className="users-page">
      {flash ? (
        <div className="toast users-flash" role="status">
          <span>{flash}</span>
          <button type="button" onClick={() => setFlash("")}>Cerrar</button>
        </div>
      ) : null}

      <header className="users-hero">
        <div>
          <p className="users-kicker">Equipo del panel</p>
          <h1>Usuarios</h1>
          <p className="lead">Personas que administran el catálogo. No son compradores.</p>
          <p className="users-summary">{summary}</p>
        </div>
        <button type="button" id={inviteTriggerId} className="btn users-invite" onClick={startInvite}>
          Invitar persona
        </button>
      </header>

      {inviting ? (
        <section className="users-panel users-invite-panel" aria-label="Invitar persona">
          <header className="users-panel-head">
            <div>
              <h2>Invitar al panel</h2>
              <p>Elige un rol claro. La clave inicial necesita 10 caracteres, letras y un número.</p>
            </div>
            <button
              type="button"
              className="users-text-btn"
              onClick={() => {
                setInviting(false);
                queueMicrotask(() => document.getElementById(inviteTriggerId)?.focus());
              }}
            >
              Cancelar
            </button>
          </header>
          <BoundForm
            action={saveUserAction}
            label="Crear acceso"
            onSuccess={(message) => {
              setInviting(false);
              remember(message);
              queueMicrotask(() => document.getElementById(inviteTriggerId)?.focus());
            }}
          >
            <div className="users-pair">
              <label className="field">Nombre<input name="name" required minLength={2} maxLength={80} autoFocus placeholder="Ej. Ana Ríos" /></label>
              <label className="field">Correo<input name="email" type="email" required maxLength={120} placeholder="ana@tienda.com" /></label>
            </div>
            <div className="users-pair">
              <label className="field">
                Rol
                <select name="role" value={inviteRole} onChange={(event) => setInviteRole(event.target.value as Role)}>
                  {ROLE_OPTIONS.map((item) => (
                    <option key={item.value} value={item.value}>{item.label}</option>
                  ))}
                </select>
              </label>
              <label className="field">Clave inicial<input name="password" type="password" required minLength={10} maxLength={72} autoComplete="new-password" /></label>
            </div>
            <label className="field">Confirmar clave<input name="passwordConfirm" type="password" required minLength={10} maxLength={72} autoComplete="new-password" /></label>
            <p className="hint">{roleHint(inviteRole)}</p>
            <label className="field check"><input name="active" type="checkbox" defaultChecked />Puede entrar desde ya</label>
          </BoundForm>
        </section>
      ) : null}

      <section className="users-panel">
        <div className="users-toolbar">
          <label className="users-search">
            <span className="visually-hidden">Buscar</span>
            <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar por nombre, correo o rol" aria-label="Buscar usuario" />
          </label>
          <div className="users-filters pills" role="group" aria-label="Estado">
            {(
              [
                ["all", "Todos"],
                ["active", "Con acceso"],
                ["inactive", "Sin acceso"],
              ] as const
            ).map(([value, label]) => (
              <button
                key={value}
                type="button"
                className="pill"
                aria-pressed={status === value}
                onClick={() => setStatus(value)}
              >
                {label}
              </button>
            ))}
          </div>
          <label className="users-role-filter">
            <span className="visually-hidden">Filtrar por rol</span>
            <select value={role} onChange={(event) => setRole(event.target.value as RoleFilter)} aria-label="Filtrar por rol">
              <option value="all">Todos los roles</option>
              {ROLE_OPTIONS.map((item) => (
                <option key={item.value} value={item.value}>{item.label}</option>
              ))}
            </select>
          </label>
        </div>

        {visible.length ? (
          <ul className="users-board">
            {visible.map((user) => {
              const mine = user.id === currentUserId;
              const open = openId === user.id;
              const editorId = `user-editor-${user.id}`;
              return (
                <li key={user.id} className={`users-row${user.active ? "" : " is-off"}${open ? " is-open" : ""}`}>
                  <button
                    type="button"
                    className="users-row-main"
                    onClick={() => toggle(user.id)}
                    aria-expanded={open}
                    aria-controls={editorId}
                  >
                    <span className={`users-avatar${mine ? " is-you" : ""}`} aria-hidden="true">{initialOf(user.name)}</span>
                    <span className="users-who">
                      <span className="users-name">
                        {user.name}
                        {mine ? <em>Tú</em> : null}
                      </span>
                      <span className="users-mail">{user.email}</span>
                      <span className="users-meta users-meta-inline">
                        <span className="users-tag">{roleLabel(user.role)}</span>
                        <span className={`users-dot ${user.active ? "is-on" : "is-off"}`}>{user.active ? "Con acceso" : "Sin acceso"}</span>
                      </span>
                    </span>
                    <span className="users-meta users-meta-wide">
                      <span className="users-tag">{roleLabel(user.role)}</span>
                      <span className={`users-dot ${user.active ? "is-on" : "is-off"}`}>{user.active ? "Con acceso" : "Sin acceso"}</span>
                      <span className="users-ago">{now ? userLastAccess(user.lastLoginAt, now) : "…"}</span>
                    </span>
                    <span className="users-chevron">{open ? "Cerrar" : "Editar"}</span>
                  </button>
                  {open ? (
                    <div className="users-editor" id={editorId}>
                      <p className="hint">{roleHint(user.role)}</p>
                      {mine ? <p className="hint">Si bajas tu rol de administrador, saldrás de Usuarios al guardar.</p> : null}
                      <BoundForm
                        action={saveUserAction}
                        label="Guardar cambios"
                        onSuccess={(message) => {
                          setOpenId(null);
                          remember(message);
                        }}
                      >
                        <input type="hidden" name="id" value={user.id} />
                        <div className="users-pair">
                          <label className="field">Nombre<input name="name" required minLength={2} maxLength={80} defaultValue={user.name} /></label>
                          <label className="field">Correo<input name="email" type="email" required maxLength={120} defaultValue={user.email} /></label>
                        </div>
                        <div className="users-pair">
                          <label className="field">
                            Rol
                            <select name="role" defaultValue={user.role}>
                              {ROLE_OPTIONS.map((item) => (
                                <option key={item.value} value={item.value}>{item.label}</option>
                              ))}
                            </select>
                          </label>
                          <label className="field">
                            Nueva clave
                            <input name="password" type="password" minLength={10} maxLength={72} autoComplete="new-password" placeholder="Déjala vacía para no cambiarla" />
                          </label>
                        </div>
                        <label className="field">
                          Confirmar clave
                          <input name="passwordConfirm" type="password" minLength={10} maxLength={72} autoComplete="new-password" placeholder="Solo si cambias la clave" />
                        </label>
                        <label className="field check">
                          <input name="active" type="checkbox" defaultChecked={user.active} disabled={mine} />
                          {mine ? "Tu cuenta tiene que seguir activa" : "Puede entrar al panel"}
                        </label>
                        {mine ? <input type="hidden" name="active" value="on" /> : null}
                      </BoundForm>
                    </div>
                  ) : null}
                </li>
              );
            })}
          </ul>
        ) : (
          <div className="users-empty">
            {users.length === 0 ? (
              <>
                <p>Todavía no hay nadie en el equipo.</p>
                <button type="button" className="users-text-btn" onClick={startInvite}>
                  Invitar a la primera persona
                </button>
              </>
            ) : (
              <>
                <p>Nadie coincide con esa búsqueda.</p>
                <button type="button" className="users-text-btn" onClick={() => { setQuery(""); setStatus("all"); setRole("all"); }}>
                  Limpiar filtros
                </button>
              </>
            )}
          </div>
        )}
      </section>

      <details className="users-guide">
        <summary>Qué puede hacer cada rol</summary>
        <ul>
          {ROLE_OPTIONS.map((item) => (
            <li key={item.value}>
              <strong>{item.label}</strong>
              <span>{item.hint}</span>
            </li>
          ))}
        </ul>
        <p className="hint">Deja al menos un administrador activo. Si alguien deja el equipo, quítale el acceso en lugar de borrar la cuenta.</p>
      </details>
    </div>
  );
}
