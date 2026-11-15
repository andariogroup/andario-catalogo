import { NextResponse } from "next/server";
import { purgeExpiredQuotes } from "@/lib/quote-retention";
import { cronSecret } from "@/lib/env";

export const dynamic = "force-dynamic";

function authorized(request: Request) {
  const expected = cronSecret();
  if (!expected) return false;
  const header = request.headers.get("authorization") ?? "";
  const bearer = header.startsWith("Bearer ") ? header.slice(7) : "";
  const query = new URL(request.url).searchParams.get("secret") ?? "";
  return bearer === expected || query === expected;
}

async function run(request: Request) {
  if (!authorized(request)) {
    return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  }
  const result = await purgeExpiredQuotes();
  return NextResponse.json({
    ok: true,
    removed: result.removed,
    days: result.days,
  });
}

export async function GET(request: Request) {
  return run(request);
}

export async function POST(request: Request) {
  return run(request);
}
