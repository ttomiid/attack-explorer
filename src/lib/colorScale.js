function hexToRgb(hex) {
  const h = hex.replace("#", "");
  const full = h.length === 3 ? h.split("").map((c) => c + c).join("") : h;
  const int = parseInt(full.slice(0, 6), 16);
  return { r: (int >> 16) & 255, g: (int >> 8) & 255, b: int & 255 };
}

function rgbToHex({ r, g, b }) {
  const toHex = (v) => Math.round(Math.max(0, Math.min(255, v))).toString(16).padStart(2, "0");
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

function lerp(a, b, t) {
  return a + (b - a) * t;
}

/** Interpola sobre N colores distribuidos uniformemente entre minValue y maxValue. */
export function scoreToColor(score, gradient) {
  const { colors, minValue, maxValue } = gradient;
  if (score === null || score === undefined || Number.isNaN(score)) return null;
  if (colors.length === 0) return null;
  if (colors.length === 1) return colors[0];

  const clamped = Math.max(minValue, Math.min(maxValue, score));
  const t = maxValue === minValue ? 0 : (clamped - minValue) / (maxValue - minValue);
  const segments = colors.length - 1;
  const segT = t * segments;
  const idx = Math.min(segments - 1, Math.floor(segT));
  const localT = segT - idx;

  const c1 = hexToRgb(colors[idx]);
  const c2 = hexToRgb(colors[idx + 1]);
  return rgbToHex({
    r: lerp(c1.r, c2.r, localT),
    g: lerp(c1.g, c2.g, localT),
    b: lerp(c1.b, c2.b, localT),
  });
}
