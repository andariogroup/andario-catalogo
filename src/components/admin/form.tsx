"use client";

import { useActionState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { emptyForm, type FormState } from "@/lib/form";

export function BoundForm({
  action,
  children,
  label = "Guardar",
  onSuccess,
}: {
  action: (state: FormState, data: FormData) => Promise<FormState>;
  children: React.ReactNode;
  label?: string;
  onSuccess?: (message: string) => void;
}) {
  const router = useRouter();
  const [state, formAction, pending] = useActionState(action, emptyForm);
  const seen = useRef("");
  useEffect(() => {
    if (!state.ok || state.ok === seen.current) return;
    seen.current = state.ok;
    onSuccess?.(state.ok);
    router.refresh();
  }, [state.ok, router, onSuccess]);
  return (
    <form className="stack" action={formAction}>
      {children}
      {state.error ? <p className="note-bad" role="alert">{state.error}</p> : null}
      {!onSuccess && state.ok ? <p className="note-ok" role="status">{state.ok}</p> : null}
      <button className="btn" disabled={pending} aria-busy={pending}>
        {pending ? "Guardando" : label}
      </button>
    </form>
  );
}
