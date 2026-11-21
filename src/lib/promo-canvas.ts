import { PROMO_SIZE, STORY_SAFE, promoArtCopy, promoExportBlocks, type PromoArtCopy, type PromoFormat, type PromoTemplate } from "@/lib/promo";

export type PromoPaintInput = {
  format: PromoFormat;
  template: PromoTemplate | string;
  business: string;
  name: string;
  short: string;
  category: string;
  priceLabel: string;
  compareLabel: string;
  priceMode: string;
  availability: string;
  points?: string[];
  cta: string;
  background: string;
  ink: string;
  muted: string;
  accent: string;
  button: string;
  buttonInk: string;
  photoWell: string;
  photoUrl: string;
  logoUrl: string;
  fontPair: string;
};

type Row = {
  key: string;
  text: string;
  size: number;
  min: number;
  font: string;
  maxLines: number;
  gap: number;
  indent: number;
};

/** Pila válida para canvas. No envuelve toda la lista en unas solas comillas. */
function fontStack(variable: string, fallback: string) {
  const raw = getComputedStyle(document.documentElement).getPropertyValue(variable).trim();
  const families = (raw || fallback)
    .split(",")
    .map((part) => part.trim().replace(/^['"]+|['"]+$/g, ""))
    .filter(Boolean);
  if (!families.some((name) => name.toLowerCase() === fallback.toLowerCase())) families.push(fallback);
  return families.map((name) => (/[\s]/.test(name) ? `"${name}"` : name)).join(", ");
}

function applyFont(ctx: CanvasRenderingContext2D, weight: string, size: number, stack: string) {
  const pxSize = `${Math.max(12, Math.round(size))}px`;
  ctx.font = `${weight} ${pxSize} ${stack}`;
  if (!ctx.font.includes(pxSize)) ctx.font = `${weight} ${pxSize} Georgia, serif`;
}

async function warmStack(stack: string) {
  const first = stack.split(",")[0]?.trim();
  if (!first || !document.fonts?.load) return;
  await Promise.all([
    document.fonts.load(`500 72px ${first}`).catch(() => undefined),
    document.fonts.load(`400 32px ${first}`).catch(() => undefined),
  ]);
}

function loadImage(url: string): Promise<HTMLImageElement | null> {
  if (!url.startsWith("https://")) return Promise.resolve(null);
  return new Promise((resolve) => {
    const image = new Image();
    image.crossOrigin = "anonymous";
    image.onload = () => resolve(image);
    image.onerror = () => resolve(null);
    image.src = url;
  });
}

function rounded(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  const radius = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x + w, y, x + w, y + h, radius);
  ctx.arcTo(x + w, y + h, x, y + h, radius);
  ctx.arcTo(x, y + h, x, y, radius);
  ctx.arcTo(x, y, x + w, y, radius);
  ctx.closePath();
}

function ellipsis(ctx: CanvasRenderingContext2D, text: string, maxWidth: number) {
  const clean = text.trim();
  if (!clean) return "";
  if (ctx.measureText(clean).width <= maxWidth) return clean;
  let next = clean;
  while (next.length > 1 && ctx.measureText(`${next}…`).width > maxWidth) next = next.slice(0, -1);
  return `${next.trimEnd()}…`;
}

function wrap(ctx: CanvasRenderingContext2D, text: string, maxWidth: number, maxLines: number) {
  const words = text.trim().split(/\s+/).filter(Boolean);
  if (!words.length || maxLines < 1) return [];
  const lines: string[] = [];
  let current = "";
  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word;
    if (ctx.measureText(candidate).width <= maxWidth) {
      current = candidate;
      continue;
    }
    if (current) lines.push(current);
    current = word;
    if (lines.length === maxLines) break;
  }
  if (lines.length < maxLines && current) lines.push(current);
  const visible = lines.slice(0, maxLines);
  const used = visible.join(" ").split(/\s+/).filter(Boolean).length;
  const last = visible.length - 1;
  if (used < words.length) visible[last] = ellipsis(ctx, `${visible[last]} ${words.slice(used).join(" ")}`, maxWidth);
  else visible[last] = ellipsis(ctx, visible[last], maxWidth);
  return visible.filter(Boolean);
}

function contain(ctx: CanvasRenderingContext2D, image: HTMLImageElement, x: number, y: number, w: number, h: number) {
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  const scale = Math.min(w / image.width, h / image.height);
  const dw = image.width * scale;
  const dh = image.height * scale;
  ctx.drawImage(image, x + (w - dw) / 2, y + (h - dh) / 2, dw, dh);
}

function cover(ctx: CanvasRenderingContext2D, image: HTMLImageElement, x: number, y: number, w: number, h: number) {
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  const scale = Math.max(w / image.width, h / image.height);
  const dw = image.width * scale;
  const dh = image.height * scale;
  ctx.drawImage(image, x + (w - dw) / 2, y + (h - dh) / 2, dw, dh);
}

function channel(hex: string) {
  const raw = hex.replace("#", "");
  if (!/^[0-9a-fA-F]{6}$/.test(raw)) return [0, 0, 0];
  return [0, 2, 4].map((start) => parseInt(raw.slice(start, start + 2), 16) / 255);
}

function luma(hex: string) {
  const [red, green, blue] = channel(hex).map((value) => (value <= 0.03928 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4));
  return 0.2126 * red + 0.7152 * green + 0.0722 * blue;
}

function contrast(a: string, b: string) {
  const left = luma(a);
  const right = luma(b);
  const hi = Math.max(left, right);
  const lo = Math.min(left, right);
  return (hi + 0.05) / (lo + 0.05);
}

function inkOn(background: string, dark: string, light: string) {
  return contrast(background, dark) >= contrast(background, light) ? dark : light;
}

function ctaColors(button: string, buttonInk: string, accent: string, background: string, ink: string) {
  const accentInk = inkOn(accent, ink, buttonInk);
  if (contrast(accent, accentInk) >= 4.5) return { fill: accent, ink: accentInk };
  const paperInk = inkOn(background, button, ink);
  if (contrast(background, paperInk) >= 4.5) return { fill: background, ink: paperInk };
  return { fill: buttonInk, ink: button };
}

function px(width: number, at1080: number) {
  return Math.round((width / 1080) * at1080);
}

function rowsFor(copy: PromoArtCopy, width: number, display: string, body: string): Row[] {
  const priceSize = copy.style === "direct" ? 84 : copy.style === "benefit" ? 44 : 48;
  const headlineSize = copy.style === "editorial" ? 76 : copy.style === "experience" ? 64 : copy.style === "benefit" ? 58 : 52;
  const headlineMin = copy.style === "editorial" ? 64 : copy.style === "experience" ? 56 : copy.style === "benefit" ? 50 : 44;
  const headlineLines = !copy.name && copy.headline.length > 42 ? 3 : 2;
  const row = (partial: Omit<Row, "indent"> & { indent?: number }): Row => ({ indent: 0, ...partial });
  const rows: Row[] = [];
  if (copy.kicker) rows.push(row({ key: "kicker", text: copy.kicker, size: px(width, 26), min: px(width, 22), font: body, maxLines: 1, gap: px(width, 14) }));
  rows.push(row({ key: "headline", text: copy.headline, size: px(width, headlineSize), min: px(width, headlineMin), font: display, maxLines: headlineLines, gap: px(width, 16) }));
  if (copy.style === "benefit") {
    for (const point of copy.points) {
      rows.push(row({ key: "point", text: point, size: px(width, 34), min: px(width, 30), font: body, maxLines: 2, gap: px(width, 12), indent: px(width, 36) }));
    }
  }
  if (copy.style !== "benefit" && copy.name) rows.push(row({ key: "name", text: copy.name, size: px(width, 40), min: px(width, 32), font: body, maxLines: 2, gap: px(width, 12) }));
  if (copy.style !== "benefit" && copy.benefit) rows.push(row({ key: "benefit", text: copy.benefit, size: px(width, 36), min: px(width, 30), font: body, maxLines: 2, gap: px(width, 14) }));
  if (copy.compare) rows.push(row({ key: "compare", text: copy.compare, size: px(width, 32), min: px(width, 26), font: body, maxLines: 1, gap: px(width, 6) }));
  if (copy.price) rows.push(row({ key: "price", text: copy.price, size: px(width, priceSize), min: px(width, copy.style === "direct" ? 68 : 40), font: display, maxLines: 1, gap: px(width, 8) }));
  if (copy.note) rows.push(row({ key: "note", text: copy.note, size: px(width, 34), min: px(width, 28), font: body, maxLines: 1, gap: px(width, 12) }));
  return rows;
}

function rowHeight(ctx: CanvasRenderingContext2D, row: Row, maxWidth: number) {
  applyFont(ctx, "500", row.size, row.font);
  const lines = wrap(ctx, row.text, Math.max(40, maxWidth - row.indent), row.maxLines);
  return { lines, height: lines.length * Math.round(row.size * 1.16) + row.gap };
}

function fitRows(ctx: CanvasRenderingContext2D, rows: Row[], maxWidth: number, maxHeight: number) {
  const next = rows.map((row) => ({ ...row }));
  const total = () => next.reduce((sum, row) => sum + rowHeight(ctx, row, maxWidth).height, 0);
  const drop = (key: string) => {
    const index = next.findIndex((row) => row.key === key);
    if (index < 0) return false;
    next.splice(index, 1);
    return true;
  };
  const clampLines = (key: string, lines: number) => {
    let changed = false;
    for (const item of next) {
      if (item.key === key && item.maxLines > lines) {
        item.maxLines = lines;
        changed = true;
      }
    }
    return changed;
  };
  const dropLast = (key: string) => {
    const index = next.findLastIndex((item) => item.key === key);
    if (index < 0) return false;
    next.splice(index, 1);
    return true;
  };
  const shrink = (key: string) => {
    const row = next.find((item) => item.key === key);
    if (!row || row.size <= row.min) return false;
    row.size = Math.max(row.min, row.size - 4);
    return true;
  };
  let guard = 0;
  while (total() > maxHeight && guard < 32) {
    guard += 1;
    const pointCount = next.filter((item) => item.key === "point").length;
    if (clampLines("point", 1)) continue;
    if (pointCount > 1 && dropLast("point")) continue;
    if (clampLines("benefit", 1) || clampLines("name", 1)) continue;
    if (drop("kicker")) continue;
    if (shrink("headline")) continue;
    if (drop("benefit") || drop("compare") || dropLast("point")) continue;
    if (shrink("price")) continue;
    if (drop("name") || drop("note")) continue;
    if (clampLines("headline", 2) || clampLines("headline", 1)) continue;
    break;
  }
  let y = 0;
  const placed: { text: string; size: number; font: string; y: number; key: string; indent: number }[] = [];
  for (const row of next) {
    const measured = rowHeight(ctx, row, maxWidth);
    measured.lines.forEach((text, index) => {
      placed.push({ text, size: row.size, font: row.font, y: y + index * Math.round(row.size * 1.16), key: row.key, indent: row.indent });
    });
    y += measured.height;
  }
  return { placed, height: y, overflow: total() > maxHeight };
}

function phoneIcon(ctx: CanvasRenderingContext2D, x: number, y: number, size: number, color: string) {
  ctx.save();
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineWidth = Math.max(2, size * 0.08);
  rounded(ctx, x + size * 0.28, y, size * 0.44, size, size * 0.12);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(x + size * 0.5, y + size * 0.78, Math.max(1.5, size * 0.045), 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

export async function paintPromo(canvas: HTMLCanvasElement, input: PromoPaintInput, cancelled: () => boolean) {
  const size = PROMO_SIZE[input.format];
  canvas.width = size.width;
  canvas.height = size.height;
  const ctx = canvas.getContext("2d");
  if (!ctx) return { ok: false, blocks: ["No se pudo preparar la imagen."] };
  if (document.fonts?.ready) await document.fonts.ready;
  if (cancelled()) return { ok: false, blocks: [] };
  const [photo, logo] = await Promise.all([loadImage(input.photoUrl), loadImage(input.logoUrl)]);
  if (cancelled()) return { ok: false, blocks: [] };

  const display = fontStack(input.fontPair === "newsreader" ? "--font-newsreader" : "--font-fraunces", "Georgia");
  const body = fontStack(input.fontPair === "newsreader" ? "--font-source" : "--font-outfit", "Segoe UI");
  await Promise.all([warmStack(display), warmStack(body)]);
  if (cancelled()) return { ok: false, blocks: [] };
  const copy = promoArtCopy(input);
  const hasPhoto = Boolean(photo);
  const style = hasPhoto ? copy.style : copy.style === "experience" ? "editorial" : copy.style;
  const width = size.width;
  const height = size.height;
  const padLeft = input.format === "story" ? px(width, STORY_SAFE.left) : px(width, 56);
  const padRight = input.format === "story" ? px(width, STORY_SAFE.right) : padLeft;
  const safeBottom = input.format === "story" ? px(width, STORY_SAFE.bottom) : px(width, 40);
  const storyTop = input.format === "story" ? px(width, STORY_SAFE.top) : padLeft;
  const contentW = width - padLeft - padRight;
  const ctaH = px(width, 96);
  const topPad = px(width, 36);
  const ctaGap = px(width, 20);
  const stamp = px(width, 108);
  const paperInk = inkOn(input.background, input.ink, input.buttonInk);
  const paperBand = style === "experience" && hasPhoto && contrast(input.background, paperInk) >= 4.5;
  const bandFill = paperBand ? input.background : input.button;
  const ink = paperBand ? paperInk : input.buttonInk;
  const textTop = storyTop + stamp + px(width, 36);
  const minPhoto = style === "benefit"
    ? (input.format === "story" ? 0.48 : 0.4)
    : style === "experience"
    ? (input.format === "story" ? 0.66 : 0.58)
    : input.format === "story" ? 0.56
    : input.format === "portrait" ? 0.52
    : style === "direct" ? 0.46
    : 0.48;
  const stackMax = hasPhoto
    ? Math.max(px(width, 180), Math.round(height * (1 - minPhoto)) - topPad - ctaGap - ctaH - safeBottom)
    : Math.max(px(width, 240), height - textTop - ctaGap - ctaH - safeBottom - px(width, 24));
  const fitted = fitRows(ctx, rowsFor({ ...copy, style }, width, display, body), contentW, stackMax);
  const bandH = topPad + fitted.height + ctaGap + ctaH + safeBottom;
  const photoH = hasPhoto ? height - bandH : 0;
  const bandY = hasPhoto ? height - bandH : textTop;
  const cursor = hasPhoto ? bandY + topPad : textTop + Math.max(0, Math.round((height - textTop - safeBottom - fitted.height - ctaGap - ctaH) / 2));
  const ctaY = cursor + fitted.height + ctaGap;

  ctx.fillStyle = bandFill;
  ctx.fillRect(0, 0, width, height);
  if (photo) {
    ctx.fillStyle = style === "experience" ? input.background : input.photoWell;
    ctx.fillRect(0, 0, width, photoH);
    if (style === "experience") {
      const inset = px(width, 48);
      contain(ctx, photo, inset, px(width, 24), width - inset * 2, Math.max(px(width, 120), photoH - px(width, 36)));
    } else {
      cover(ctx, photo, 0, 0, width, photoH);
    }
    ctx.fillStyle = bandFill;
    ctx.fillRect(0, bandY, width, bandH);
    ctx.fillStyle = input.accent;
    ctx.fillRect(0, bandY, width, Math.max(6, px(width, 8)));
  }

  ctx.fillStyle = input.background;
  rounded(ctx, padLeft, storyTop, stamp, stamp, px(width, 22));
  ctx.fill();
  if (logo) {
    const inset = px(width, 14);
    ctx.save();
    rounded(ctx, padLeft + inset, storyTop + inset, stamp - inset * 2, stamp - inset * 2, px(width, 16));
    ctx.clip();
    cover(ctx, logo, padLeft + inset, storyTop + inset, stamp - inset * 2, stamp - inset * 2);
    ctx.restore();
  } else {
    const mark = (input.business.trim().charAt(0) || "A").toUpperCase();
    ctx.fillStyle = input.button;
    applyFont(ctx, "500", px(width, 42), display);
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(mark, padLeft + stamp / 2, storyTop + stamp / 2);
    ctx.textAlign = "left";
  }

  ctx.textAlign = "left";
  ctx.textBaseline = "top";
  ctx.fillStyle = ink;
  let overlap = fitted.overflow;
  let previousBottom = -1;
  let drawnPrice = "";
  for (const line of fitted.placed) {
    if (line.key === "price") drawnPrice = line.text;
    const top = cursor + line.y;
    const bottom = top + line.size;
    if (previousBottom >= 0 && top < previousBottom - 2) overlap = true;
    previousBottom = bottom;
    if (bottom > ctaY - 4) overlap = true;
    ctx.globalAlpha = line.key === "kicker" || line.key === "benefit" || line.key === "name" ? 0.86 : 1;
    applyFont(ctx, line.key === "headline" || line.key === "price" ? "500" : "400", line.size, line.font);
    const textX = padLeft + line.indent;
    if (ctx.measureText(line.text).width > contentW - line.indent + 2) overlap = true;
    if (line.key === "point") {
      ctx.fillStyle = input.accent;
      ctx.beginPath();
      ctx.arc(padLeft + px(width, 10), top + line.size * 0.42, px(width, 7), 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = ink;
    }
    if (line.key === "compare") {
      ctx.fillText(line.text, textX, top);
      const compareW = ctx.measureText(line.text).width;
      ctx.strokeStyle = ink;
      ctx.lineWidth = Math.max(2, px(width, 2));
      const lineY = top + line.size * 0.55;
      ctx.beginPath();
      ctx.moveTo(textX, lineY);
      ctx.lineTo(textX + compareW, lineY);
      ctx.stroke();
    } else {
      ctx.fillText(line.text, textX, top);
    }
  }
  ctx.globalAlpha = 1;
  if (ctaY + ctaH > height - 4) overlap = true;

  const colors = ctaColors(input.button, input.buttonInk, input.accent, input.background, input.ink);
  rounded(ctx, padLeft, ctaY, contentW, ctaH, ctaH / 2);
  ctx.fillStyle = colors.fill;
  ctx.fill();
  applyFont(ctx, "500", px(width, 40), body);
  ctx.fillStyle = colors.ink;
  ctx.textBaseline = "middle";
  const icon = copy.whatsapp ? px(width, 34) : 0;
  const labelMax = contentW - px(width, 48) - icon - (icon ? px(width, 12) : 0);
  const label = ellipsis(ctx, copy.cta, labelMax);
  const labelW = ctx.measureText(label).width;
  const group = labelW + (icon ? icon + px(width, 12) : 0);
  let textX = padLeft + (contentW - group) / 2;
  if (icon) {
    phoneIcon(ctx, textX, ctaY + (ctaH - icon) / 2, icon, colors.ink);
    textX += icon + px(width, 12);
  }
  ctx.fillText(label, textX, ctaY + ctaH / 2);
  ctx.textBaseline = "alphabetic";
  if (ctx.measureText(label).width > labelMax + 2) overlap = true;
  return {
    ok: true,
    blocks: promoExportBlocks({
      priceLabel: input.priceLabel,
      priceMode: input.priceMode,
      paintedPrice: drawnPrice,
      headlineContrast: contrast(bandFill, ink),
      ctaContrast: contrast(colors.fill, colors.ink),
      overflow: overlap,
      photoUrl: hasPhoto ? input.photoUrl : "",
      template: copy.style,
    }),
  };
}
