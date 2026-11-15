"use server";

import { recordEvent } from "@/lib/store";

export async function trackEventAction(name: string, path: string, productId = "", source = "") {
  await recordEvent(name, path, productId, source);
}
