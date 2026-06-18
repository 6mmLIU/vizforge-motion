import { coerceNumber } from "@/lib/data/inferSchema";
import type { DataRow, VisualSpec, VisualType } from "@/lib/visual/visualSpec";
import type { VisualTheme } from "@/lib/visual/themes";

const DESIGNER_SEQUENCE = [
  "#0a84ff",
  "#34c759",
  "#ff9f0a",
  "#ff375f",
  "#af52de",
  "#5ac8fa",
  "#ffd60a",
  "#32d74b",
  "#bf5af2",
  "#ff6b35",
  "#64d2ff",
  "#30d158",
  "#ffcc00",
  "#ff2d55",
  "#5856d6",
  "#40c8e0"
];

const PART_TO_WHOLE_TYPES: VisualType[] = ["donut", "pie", "arc", "rose", "gauge", "treemap"];
const BAR_TYPES: VisualType[] = ["bar", "horizontal-bar", "stacked-bar", "grouped-bar", "waterfall", "ranking", "bar-race"];
const POINT_TYPES: VisualType[] = ["scatter", "bubble", "heatmap", "metric-card", "radar", "network"];

type Rgb = { r: number; g: number; b: number };
type Hsl = { h: number; s: number; l: number };

export function resolvePaletteForSpec(spec: VisualSpec, theme: VisualTheme): string[] {
  const requestedCount = resolveVisualItemCount(spec);
  const base = spec.palette?.length ? spec.palette : theme.palette;
  return expandPalette(base, requestedCount);
}

export function resolveVisualItemCount(spec: VisualSpec): number {
  const rows = spec.data.rows;
  if (!rows.length) return 1;

  if (PART_TO_WHOLE_TYPES.includes(spec.type)) {
    return uniqueCount(rows, resolveCategoryField(spec));
  }

  if (BAR_TYPES.includes(spec.type) || POINT_TYPES.includes(spec.type)) {
    return rows.length;
  }

  if (spec.type === "area") {
    if (spec.mappings?.series) return uniqueCount(rows, spec.mappings.series);
    return Math.max(1, numericSeriesCount(spec));
  }

  if (spec.type === "line" || spec.type === "timeline" || spec.type === "slope" || spec.type === "bump" || spec.type === "line-race") {
    return spec.mappings?.series ? uniqueCount(rows, spec.mappings.series) : 1;
  }

  if (spec.type === "sankey") {
    const source = spec.mappings?.source ?? "source";
    const target = spec.mappings?.target ?? "target";
    return new Set(rows.flatMap((row) => [row[source], row[target]].map((value) => String(value ?? "").trim()).filter(Boolean))).size || rows.length;
  }

  return rows.length;
}

export function expandPalette(seedColors: string[], requestedCount: number): string[] {
  const count = Math.max(1, Math.min(500, Math.floor(requestedCount) || 1));
  const colors = uniqueColors(seedColors);

  for (const color of DESIGNER_SEQUENCE) {
    if (colors.length >= count) break;
    if (!colors.some((existing) => colorDistance(existing, color) < 44)) colors.push(color);
  }

  let index = 0;
  while (colors.length < count && index < count * 12) {
    const base = colors[index % colors.length] ?? DESIGNER_SEQUENCE[index % DESIGNER_SEQUENCE.length];
    const hsl = rgbToHsl(hexToRgb(base));
    const next = hslToHex({
      h: (hsl.h + 137.508 * (index + 1)) % 360,
      s: clamp(hsl.s + (index % 3 === 0 ? -0.04 : 0.06), 0.54, 0.82),
      l: clamp(hsl.l + (index % 2 === 0 ? 0.08 : -0.08), 0.42, 0.68)
    });
    const threshold = colors.length < 80 ? 34 : colors.length < 180 ? 24 : colors.length < 320 ? 16 : 8;
    if (!colors.some((existing) => colorDistance(existing, next) < threshold)) colors.push(next);
    index += 1;
  }

  while (colors.length < count) {
    const hue = (colors.length * 137.508) % 360;
    const saturation = 0.62 + (colors.length % 5) * 0.04;
    const lightness = 0.44 + (colors.length % 7) * 0.035;
    colors.push(hslToHex({ h: hue, s: saturation, l: clamp(lightness, 0.4, 0.68) }));
  }

  return colors.slice(0, count);
}

function resolveCategoryField(spec: VisualSpec): string {
  const rows = spec.data.rows;
  const keys = Object.keys(rows[0] ?? {});
  const valueField = spec.mappings?.value ?? spec.mappings?.y ?? keys.find((key) => rows.some((row) => coerceNumber(row[key]) !== null));
  return spec.mappings?.category ?? spec.mappings?.x ?? keys.find((key) => key !== valueField) ?? keys[0] ?? "category";
}

function uniqueCount(rows: DataRow[], field: string): number {
  const values = rows.map((row, index) => {
    const text = row[field] === undefined || row[field] === null ? "" : String(row[field]).trim();
    return text || `Item ${index + 1}`;
  });
  return new Set(values).size || rows.length || 1;
}

function numericSeriesCount(spec: VisualSpec): number {
  const rows = spec.data.rows;
  const excluded = new Set([spec.mappings?.x, spec.mappings?.category, spec.mappings?.series].filter((field): field is string => Boolean(field)));
  const keys = Array.from(new Set(rows.flatMap((row) => Object.keys(row))));
  return keys.filter((key) => !excluded.has(key) && rows.some((row) => coerceNumber(row[key]) !== null)).length;
}

function uniqueColors(input: string[]): string[] {
  const seen = new Set<string>();
  return input
    .map(normalizeHex)
    .filter((color): color is string => Boolean(color))
    .filter((color) => {
      if (seen.has(color)) return false;
      seen.add(color);
      return true;
    });
}

function normalizeHex(color: string): string | null {
  const text = color.trim();
  const short = text.match(/^#([0-9a-fA-F]{3})$/);
  if (short) {
    const [r, g, b] = short[1].split("");
    return `#${r}${r}${g}${g}${b}${b}`.toLowerCase();
  }
  if (/^#[0-9a-fA-F]{6}$/.test(text)) return text.toLowerCase();
  return null;
}

function hexToRgb(hex: string): Rgb {
  const normalized = normalizeHex(hex) ?? "#0a84ff";
  const value = Number.parseInt(normalized.slice(1), 16);
  return {
    r: (value >> 16) & 255,
    g: (value >> 8) & 255,
    b: value & 255
  };
}

function rgbToHsl({ r, g, b }: Rgb): Hsl {
  const rn = r / 255;
  const gn = g / 255;
  const bn = b / 255;
  const max = Math.max(rn, gn, bn);
  const min = Math.min(rn, gn, bn);
  const l = (max + min) / 2;
  if (max === min) return { h: 0, s: 0, l };
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  let h = 0;
  if (max === rn) h = (gn - bn) / d + (gn < bn ? 6 : 0);
  else if (max === gn) h = (bn - rn) / d + 2;
  else h = (rn - gn) / d + 4;
  return { h: h * 60, s, l };
}

function hslToHex({ h, s, l }: Hsl): string {
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const hp = h / 60;
  const x = c * (1 - Math.abs((hp % 2) - 1));
  const [r1, g1, b1] =
    hp < 1 ? [c, x, 0] : hp < 2 ? [x, c, 0] : hp < 3 ? [0, c, x] : hp < 4 ? [0, x, c] : hp < 5 ? [x, 0, c] : [c, 0, x];
  const m = l - c / 2;
  return rgbToHex({
    r: Math.round((r1 + m) * 255),
    g: Math.round((g1 + m) * 255),
    b: Math.round((b1 + m) * 255)
  });
}

function rgbToHex({ r, g, b }: Rgb): string {
  return `#${[r, g, b].map((value) => clamp(Math.round(value), 0, 255).toString(16).padStart(2, "0")).join("")}`;
}

function colorDistance(a: string, b: string): number {
  const ca = hexToRgb(a);
  const cb = hexToRgb(b);
  return Math.sqrt((ca.r - cb.r) ** 2 + (ca.g - cb.g) ** 2 + (ca.b - cb.b) ** 2);
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}
