"use client";

import { useSyncExternalStore } from "react";

export type InterestItem = { productId: string; name: string; variantId?: string; variant?: string; quantity: number; price?: string };

const KEY = "andario-interes";
const listeners = new Set<() => void>();

function read(): InterestItem[] {
  if (typeof window === "undefined") return [];
  try {
    const parsed = JSON.parse(localStorage.getItem(KEY) ?? "[]") as InterestItem[];
    return Array.isArray(parsed) ? parsed.slice(0, 20) : [];
  } catch {
    return [];
  }
}

function write(items: InterestItem[]) {
  localStorage.setItem(KEY, JSON.stringify(items));
  listeners.forEach((listener) => listener());
}

export function clearInterest() {
  if (read().length === 0) return;
  write([]);
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  const onStorage = () => listener();
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", onStorage);
  };
}

export function useInterest() {
  const raw = useSyncExternalStore(subscribe, () => localStorage.getItem(KEY) ?? "[]", () => "[]");
  let items: InterestItem[] = [];
  try {
    const parsed = JSON.parse(raw) as InterestItem[];
    items = Array.isArray(parsed) ? parsed : [];
  } catch {
    items = [];
  }
  return {
    items,
    add(item: InterestItem) {
      const next = read().filter((current) => !(current.productId === item.productId && current.variantId === item.variantId));
      next.push(item);
      write(next.slice(0, 20));
    },
    remove(productId: string, variantId?: string) {
      write(read().filter((item) => !(item.productId === productId && item.variantId === variantId)));
    },
    setQuantity(productId: string, variantId: string | undefined, quantity: number) {
      write(read().map((item) => (item.productId === productId && item.variantId === variantId ? { ...item, quantity } : item)));
    },
    clear() {
      clearInterest();
    },
  };
}
