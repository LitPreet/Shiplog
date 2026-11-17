// Picks the text colour (white or near-black) with the higher WCAG contrast
// against a background colour. Owners can choose any accent, so button text
// must adapt: white on indigo, dark on orange, sky or lime.
const DARK_INK = "#111114";

function luminance(hex: string) {
  const [r, g, b] = [1, 3, 5].map((i) => {
    const v = parseInt(hex.slice(i, i + 2), 16) / 255;
    return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

const contrast = (a: number, b: number) => (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);

export function readableInk(bgHex: string): string {
  if (!/^#[0-9a-f]{6}$/i.test(bgHex)) return "#ffffff";
  const bg = luminance(bgHex);
  return contrast(bg, 1) >= contrast(bg, luminance(DARK_INK)) ? "#ffffff" : DARK_INK;
}
