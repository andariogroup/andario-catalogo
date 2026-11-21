import QRCode from "qrcode";
import { catalogOrigin } from "@/lib/seo";
import { loadShell, recordEvent } from "@/lib/store";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const path = url.searchParams.get("path") ?? "/";
  if (!path.startsWith("/") || path.startsWith("//") || path.includes("\\") || path.includes("?")) return new Response("Ruta inválida", { status: 400 });
  const shell = await loadShell().catch(() => null);
  const target = `${catalogOrigin(shell?.settings.publicUrl ?? "")}${path}?utm_source=qr`;
  if (url.searchParams.get("format") === "png") {
    if (path.startsWith("/producto/")) await recordEvent("product_qr_download", path);
    const buffer = await QRCode.toBuffer(target, { width: 720, margin: 2 });
    return new Response(new Uint8Array(buffer), {
      headers: { "Content-Type": "image/png", "Content-Disposition": `attachment; filename="qr${path.split("/").join("-")}.png"` },
    });
  }
  const svg = await QRCode.toString(target, { type: "svg", margin: 2 });
  return new Response(svg, { headers: { "Content-Type": "image/svg+xml" } });
}
