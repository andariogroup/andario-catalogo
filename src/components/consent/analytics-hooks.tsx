"use client";

import { useEffect, type ReactNode } from "react";
import {
  trackAddToCart,
  trackContactWhatsapp,
  trackRemoveFromCart,
  trackSelectItem,
  trackViewCart,
  trackViewItem,
  trackViewItemList,
  type AnalyticsItem,
} from "@/lib/analytics";

export function TrackViewItem({
  currency,
  value,
  items,
}: {
  currency: string;
  value: number | null;
  items: AnalyticsItem[];
}) {
  const key = JSON.stringify({ currency, value, items });
  useEffect(() => {
    trackViewItem({ currency, value, items });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- key serializa el payload
  }, [key]);
  return null;
}

export function TrackViewItemList({
  itemListId,
  itemListName,
  items,
}: {
  itemListId?: string;
  itemListName?: string;
  items: AnalyticsItem[];
}) {
  useEffect(() => {
    trackViewItemList({ item_list_id: itemListId, item_list_name: itemListName, items });
  }, [itemListId, itemListName, items]);
  return null;
}

export function TrackViewCart({
  currency,
  value,
  items,
}: {
  currency: string;
  value: number | null;
  items: AnalyticsItem[];
}) {
  useEffect(() => {
    trackViewCart({ currency, value, items });
  }, [currency, value, items]);
  return null;
}

export function emitSelectItem(items: AnalyticsItem[], listName = "Catálogo") {
  trackSelectItem({ item_list_name: listName, items });
}

export function emitAddToCart(input: { currency: string; value: number | null; items: AnalyticsItem[] }) {
  trackAddToCart(input);
}

export function emitRemoveFromCart(input: { currency: string; value: number | null; items: AnalyticsItem[] }) {
  trackRemoveFromCart(input);
}

export function emitContactWhatsapp(source: string, item?: { id?: string; name?: string }) {
  trackContactWhatsapp({ source, item_id: item?.id, item_name: item?.name });
}

/** Enlace con tracking usable desde Server Components (p. ej. footer de ShopFrame). */
export function TrackedWhatsAppLink({
  href,
  source,
  className,
  children,
}: {
  href: string;
  source: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <a className={className} href={href} onClick={() => emitContactWhatsapp(source)}>
      {children}
    </a>
  );
}
