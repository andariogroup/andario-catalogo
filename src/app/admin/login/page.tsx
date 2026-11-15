"use client";

import Link from "next/link";
import { useActionState, useId, useState } from "react";
import { loginAction } from "@/actions/session";
import { emptyForm } from "@/lib/form";

export default function LoginPage() {
  const [state, action, pending] = useActionState(loginAction, emptyForm);
  const [visible, setVisible] = useState(false);
  const errorId = useId();
  const passwordId = useId();
  const hintId = useId();
  const invalid = state.error ? true : undefined;

  return (
    <main className="gate">
      <section className="gate-brand">
        <p>Andario Group</p>
        <h1>Andario Catálogo</h1>
        <p>Acceso del equipo para administrar el catálogo.</p>
      </section>
      <section className="gate-panel">
        <form className="gate-card" action={action}>
          <div>
            <h2>Entrar</h2>
            <p>Usa el correo y la clave de tu cuenta.</p>
          </div>
          <label className="field">Correo
            <input name="email" type="email" autoComplete="username" inputMode="email" autoCapitalize="none" spellCheck={false} required autoFocus aria-invalid={invalid} />
          </label>
          <div className="field">
            <label htmlFor={passwordId}>Clave</label>
            <span className="gate-secret">
              <input id={passwordId} name="password" type={visible ? "text" : "password"} autoComplete="current-password" required minLength={10} aria-invalid={invalid} aria-describedby={state.error ? `${hintId} ${errorId}` : hintId} />
              <button className="quiet" type="button" aria-pressed={visible} onClick={() => setVisible((current) => !current)}>{visible ? "Ocultar" : "Mostrar"}</button>
            </span>
            <small id={hintId} className="hint">Mínimo 10 caracteres.</small>
          </div>
          {state.error ? <p id={errorId} className="note-bad" role="alert">{state.error}</p> : null}
          <button className="btn" disabled={pending} aria-busy={pending}>{pending ? "Entrando…" : "Entrar"}</button>
          <Link href="/">Volver al catálogo</Link>
        </form>
      </section>
    </main>
  );
}
