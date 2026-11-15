export function mapEmbedSrc(mapsUrl: string) {
  let url: URL;
  try {
    url = new URL(mapsUrl);
  } catch {
    return "";
  }
  const at = url.href.match(/@(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)/);
  const query = at ? `${at[1]},${at[2]}` : url.searchParams.get("query") || url.searchParams.get("q") || "";
  const place = query || decodeURIComponent(url.pathname.match(/\/place\/([^/]+)/)?.[1] ?? "").replaceAll("+", " ");
  if (!place) return "";
  return `https://maps.google.com/maps?q=${encodeURIComponent(place)}&z=16&output=embed`;
}
