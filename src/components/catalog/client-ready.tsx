"use client";

import { useSyncExternalStore, type ReactNode } from "react";

function subscribe() {
  return () => {};
}

function getClientSnapshot() {
  return true;
}

function getServerSnapshot() {
  return false;
}

/** Evita pintar estados vacíos de localStorage antes de hidratar (flash de carrito/lista vacíos). */
export function ClientReady({
  fallback,
  children,
}: {
  fallback: ReactNode;
  children: ReactNode;
}) {
  const ready = useSyncExternalStore(subscribe, getClientSnapshot, getServerSnapshot);
  if (!ready) return <>{fallback}</>;
  return <>{children}</>;
}
