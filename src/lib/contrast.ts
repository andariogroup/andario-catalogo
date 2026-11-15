function channel(value: string): number {
  const channel = Number.parseInt(value, 16) / 255;
  return channel <= 0.03928 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
}

export function contrastRatio(foreground: string, background: string): number | null {
  const front = /^#([0-9a-f]{6})$/i.exec(foreground.trim());
  const back = /^#([0-9a-f]{6})$/i.exec(background.trim());
  if (!front || !back) return null;
  const luminance = (hex: string) => 0.2126 * channel(hex.slice(0, 2)) + 0.7152 * channel(hex.slice(2, 4)) + 0.0722 * channel(hex.slice(4, 6));
  const lighter = Math.max(luminance(front[1]), luminance(back[1]));
  const darker = Math.min(luminance(front[1]), luminance(back[1]));
  return (lighter + 0.05) / (darker + 0.05);
}
