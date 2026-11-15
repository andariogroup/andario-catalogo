"use client";

import Link from "next/link";
import { ShoppingBag } from "lucide-react";
import { usePathname } from "next/navigation";
import { useSyncExternalStore } from "react";
import {
  CART_STORAGE_KEY,
  addCartItem,
  cartNavLabel,
  cartUnitCount,
  emptyCart,
  parseCart,
  removeCartItem,
  serializeCart,
  setCartQuantity,
  type CartItem,
  type CartState,
} from "@/lib/cart";

const listeners = new Set<() => void>();
/** Copia en memoria: en iOS/privado localStorage puede fallar al escribir y el carrito quedaba vacío. */
let memoryRaw = "";

function notify() {
  listeners.forEach((listener) => listener());
}

function readRaw(): string {
  if (typeof window === "undefined") return "";
  if (memoryRaw) return memoryRaw;
  try {
    memoryRaw = localStorage.getItem(CART_STORAGE_KEY) ?? "";
  } catch {
    return memoryRaw;
  }
  return memoryRaw;
}

function writeState(state: CartState) {
  memoryRaw = serializeCart(state);
  try {
    localStorage.setItem(CART_STORAGE_KEY, memoryRaw);
  } catch {
    /* cuota o modo privado: la sesión sigue con memoryRaw + notify */
  }
  notify();
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  const onStorage = (event: StorageEvent) => {
    if (event.key === CART_STORAGE_KEY || event.key === null) {
      try {
        memoryRaw = localStorage.getItem(CART_STORAGE_KEY) ?? "";
      } catch {
        /* keep memoryRaw */
      }
      listener();
    }
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", onStorage);
  };
}

export function useCart(storeId: string) {
  const raw = useSyncExternalStore(subscribe, readRaw, () => "");
  const state = parseCart(raw, storeId);

  return {
    items: state.items,
    count: cartUnitCount(state.items),
    add(item: Omit<CartItem, "updatedAt" | "quantity"> & { quantity?: number }) {
      writeState(addCartItem(parseCart(readRaw(), storeId), item));
    },
    remove(productId: string, variantId?: string) {
      writeState(removeCartItem(parseCart(readRaw(), storeId), productId, variantId));
    },
    setQuantity(productId: string, variantId: string | undefined, quantity: number) {
      writeState(setCartQuantity(parseCart(readRaw(), storeId), productId, variantId, quantity));
    },
    clear() {
      writeState(emptyCart(storeId));
    },
  };
}

export function CartNavLink({ storeId }: { storeId: string }) {
  const cart = useCart(storeId);
  const path = usePathname();
  const active = path === "/carrito" || path.startsWith("/carrito/");
  const label = cartNavLabel(cart.count);
  return (
    <Link
      className={active ? "cart-nav is-active" : "cart-nav"}
      href="/carrito"
      aria-label={label}
      aria-current={active ? "page" : undefined}
    >
      <ShoppingBag aria-hidden="true" size={18} strokeWidth={1.85} />
      <span className="cart-nav-text">Carrito</span>
      {cart.count > 0 ? (
        <span className="cart-nav-count" aria-hidden="true">
          {cart.count > 99 ? "99+" : cart.count}
        </span>
      ) : null}
    </Link>
  );
}
