import { animate, group, line, path, rect, tag, textNode } from "@/lib/motion/svgPrimitives";
import type { CardMetric, VisualSpec } from "@/lib/visual/visualSpec";
import type { VisualTheme } from "@/lib/visual/themes";

export const FONT = "Noto Sans CJK SC, PingFang SC, Microsoft YaHei, Arial, sans-serif";

export type Rect = { x: number; y: number; width: number; height: number };

export type Geom = {
  w: number;
  h: number;
  tall: boolean;
  pad: number;
  radius: number;
  gut: number;
  s: number;
  title: { x: number; y: number; size: number };
  subtitle: { x: number; y: number; size: number } | null;
  kpi: { top: number; height: number } | null;
  period: string | null;
  headerBottom: number;
  footerY: number;
  plot: Rect;
};

export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export function round(value: number): number {
  return Number(value.toFixed(2));
}

export function formatNumber(value: number): string {
  if (!Number.isFinite(value)) return "0";
  if (Math.abs(value) >= 10000) return value.toLocaleString("en-US", { maximumFractionDigits: 0 });
  return Number.isInteger(value) ? value.toLocaleString("en-US") : value.toLocaleString("en-US", { maximumFractionDigits: 1 });
}

export function formatCompact(value: number): string {
  const abs = Math.abs(value);
  if (abs >= 1_000_000) return `${round(value / 1_000_000)}M`;
  if (abs >= 1_000) return `${round(value / 1_000)}k`;
  return formatNumber(value);
}

export function geom(spec: VisualSpec): Geom {
  const w = spec.export.width;
  const h = spec.export.height;
  const tall = h / w > 1.12;
  const wide = w / h > 1.7;
  const min = Math.min(w, h);
  const pad = clamp(Math.round(min * 0.026), 14, 26);
  const radius = clamp(Math.round(min * 0.028), 16, 26);
  const gut = clamp(Math.round(w * 0.058), 30, 60);
  const s = clamp(w / 760, 0.82, 1.3);

  const titleSize = Math.round(clamp(w * 0.046, 22, 36) * (tall ? 1.04 : 1));
  const titleX = gut;
  const titleY = pad + Math.round(clamp(min * 0.07, 38, 64));
  const hasSubtitle = Boolean(spec.subtitle && spec.subtitle.trim());
  const subtitleSize = Math.round(clamp(w * 0.02, 13, 17));
  const subtitleY = titleY + Math.round(titleSize * 0.82);

  const metrics = (spec.card?.metrics ?? []).slice(0, 4);
  const period = spec.card?.periodLabel?.trim() ? spec.card.periodLabel.trim().slice(0, 24) : null;

  let headerBottom = (hasSubtitle ? subtitleY : titleY) + Math.round(clamp(min * 0.03, 18, 30));

  let kpi: Geom["kpi"] = null;
  if (metrics.length && spec.type !== "metric-card") {
    const kpiHeight = Math.round(clamp(h * 0.1, tall ? 96 : 72, 132));
    kpi = { top: headerBottom + Math.round(8 * s), height: kpiHeight };
    headerBottom = kpi.top + kpiHeight + Math.round(clamp(min * 0.02, 12, 22));
  }

  const footerSize = Math.round(clamp(w * 0.018, 12, 15));
  const footerY = h - pad - Math.round(clamp(min * 0.02, 14, 24));
  const contentBottom = footerY - Math.round(28 * s);

  const plot: Rect = {
    x: gut,
    y: headerBottom,
    width: w - gut * 2,
    height: Math.max(120, contentBottom - headerBottom)
  };

  return {
    w,
    h,
    tall: tall && !wide,
    pad,
    radius,
    gut,
    s,
    title: { x: titleX, y: titleY, size: titleSize },
    subtitle: hasSubtitle ? { x: titleX, y: subtitleY, size: subtitleSize } : null,
    kpi,
    period,
    headerBottom,
    footerY,
    plot
  };
}

export function frame(theme: VisualTheme, g: Geom): string {
  const card = rect({
    x: g.pad,
    y: g.pad,
    width: g.w - g.pad * 2,
    height: g.h - g.pad * 2,
    rx: g.radius,
    fill: theme.surface,
    stroke: theme.border,
    "stroke-width": 1
  });

  const softShadow =
    theme.mode === "dark"
      ? rect({ x: g.pad, y: g.pad + 3, width: g.w - g.pad * 2, height: g.h - g.pad * 2, rx: g.radius, fill: "rgba(0,0,0,0.18)", opacity: 0.6 })
      : rect({ x: g.pad, y: g.pad + 2, width: g.w - g.pad * 2, height: g.h - g.pad * 2, rx: g.radius, fill: "rgba(15,23,42,0.05)", opacity: 0.7 });

  const headerBand =
    g.headerBottom > g.pad + 40
      ? rect({
          x: g.pad + 1,
          y: g.pad + 1,
          width: g.w - g.pad * 2 - 2,
          height: g.headerBottom - g.pad - 10,
          rx: g.radius - 1,
          fill: theme.header,
          opacity: theme.mode === "dark" ? 0.5 : 0.8
        })
      : "";

  const divider = line({
    x1: g.gut,
    x2: g.w - g.gut,
    y1: round(g.headerBottom - 6),
    y2: round(g.headerBottom - 6),
    stroke: theme.divider,
    "stroke-width": 1
  });

  return softShadow + card + headerBand + divider;
}

export function header(spec: VisualSpec, theme: VisualTheme, g: Geom): string {
  const available = g.w - g.gut * 2 - (g.period ? 150 : 0);
  const titleLines = wrapText(spec.title, available, g.title.size, g.tall ? 2 : 1);
  const titleSize = titleLines.length > 1 ? Math.round(g.title.size * 0.86) : g.title.size;
  const lineGap = Math.round(titleSize * 1.06);
  const titleNode = titleLines
    .map((lineText, index) =>
      textNode(lineText, {
        x: g.title.x,
        y: g.title.y + index * lineGap,
        fill: theme.strong,
        "font-size": titleSize,
        "font-family": FONT,
        "font-weight": 760
      })
    )
    .join("");

  const subtitleNode =
    g.subtitle && titleLines.length === 1
      ? textNode(fitText(spec.subtitle ?? "", available, g.subtitle.size), {
          x: g.subtitle.x,
          y: g.subtitle.y,
          fill: theme.muted,
          "font-size": g.subtitle.size,
          "font-family": FONT,
          "font-weight": 440
        })
      : "";

  const periodPill = g.period ? renderPeriodPill(theme, g) : "";
  const kpiStrip = g.kpi ? renderKpiStrip(spec.card?.metrics ?? [], theme, g) : "";

  return titleNode + subtitleNode + periodPill + kpiStrip;
}

function renderPeriodPill(theme: VisualTheme, g: Geom): string {
  const label = g.period ?? "";
  const size = Math.round(13 * g.s);
  const pillWidth = clamp(estTextWidth(label, size) + 38, 92, 200);
  const x = g.w - g.gut - pillWidth;
  const y = g.title.y - Math.round(size * 1.5);
  const pillFill = theme.mode === "dark" ? mix(theme.accent, theme.surface, 0.78) : mix(theme.accent, theme.surface, 0.88);
  return (
    rect({ x, y, width: pillWidth, height: Math.round(size * 2.4), rx: Math.round(size * 1.2), fill: pillFill, stroke: mix(theme.accent, theme.surface, 0.6), "stroke-width": 1 }) +
    textNode(label, {
      x: x + pillWidth / 2,
      y: y + Math.round(size * 1.55),
      fill: theme.strong,
      "font-size": size,
      "font-family": FONT,
      "font-weight": 560,
      "text-anchor": "middle"
    })
  );
}

function renderKpiStrip(metrics: CardMetric[], theme: VisualTheme, g: Geom): string {
  if (!g.kpi || !metrics.length) return "";
  const visible = metrics.slice(0, 4);
  const top = g.kpi.top;
  const height = g.kpi.height;
  const gap = Math.round(12 * g.s);
  const totalWidth = g.w - g.gut * 2;
  const available = totalWidth - gap * (visible.length - 1);
  const primaryWidth = visible.length > 1 ? clamp(available * 0.4, available / visible.length, available * 0.46) : available;
  const secondaryWidth = visible.length > 1 ? (available - primaryWidth) / (visible.length - 1) : primaryWidth;

  return visible
    .map((metric, index) => {
      const itemWidth = index === 0 ? primaryWidth : secondaryWidth;
      const x = index === 0 ? g.gut : g.gut + primaryWidth + gap + (index - 1) * (secondaryWidth + gap);
      const value = formatMetricValue(metric.value, metric.prefix, metric.suffix);
      const valueSize = Math.round((index === 0 ? clamp(height * 0.34, 24, 34) : clamp(height * 0.28, 19, 26)) * 1);
      const trend = metricTrend(metric);
      const padX = Math.round(16 * g.s);
      const isPrimary = index === 0;
      const primaryFill = theme.mode === "dark" ? mix(theme.accent, theme.surface, 0.86) : mix(theme.accent, theme.surface, 0.9);
      const primaryStroke = theme.mode === "dark" ? mix(theme.accent, theme.surface, 0.6) : mix(theme.accent, theme.surface, 0.7);
      const accentBar = isPrimary ? rect({ x: round(x + padX - 8), y: top + Math.round(height * 0.18), width: 3, height: Math.round(height * 0.5), rx: 2, fill: theme.accent }) : "";
      return (
        rect({
          x: round(x),
          y: top,
          width: round(itemWidth),
          height,
          rx: Math.round(16 * g.s),
          fill: isPrimary ? primaryFill : theme.header,
          stroke: isPrimary ? primaryStroke : theme.border,
          "stroke-width": 1
        }) +
        accentBar +
        textNode(metric.label, {
          x: round(x + padX),
          y: top + Math.round(height * 0.32),
          fill: theme.muted,
          "font-size": Math.round(12 * g.s),
          "font-family": FONT,
          "font-weight": 500
        }) +
        textNode(value, {
          x: round(x + padX),
          y: top + Math.round(height * 0.72),
          fill: theme.strong,
          "font-size": valueSize,
          "font-family": FONT,
          "font-weight": isPrimary ? 740 : 660
        }) +
        (trend
          ? textNode(trend.text, {
              x: round(x + itemWidth - padX),
              y: top + Math.round(height * 0.7),
              fill: trend.fill,
              "font-size": Math.round(11 * g.s),
              "font-family": FONT,
              "font-weight": 560,
              "text-anchor": "end"
            })
          : "")
      );
    })
    .join("");
}

export function footer(spec: VisualSpec, theme: VisualTheme, g: Geom): string {
  const caption = spec.caption ?? spec.insight;
  const source = spec.source;
  const size = Math.round(clamp(g.w * 0.018, 12, 15));
  const captionNode = caption
    ? textNode(fitText(caption, g.w - g.gut * 2 - (source ? 150 : 0), size), {
        x: g.gut,
        y: g.footerY,
        fill: theme.soft,
        "font-size": size,
        "font-family": FONT,
        "font-weight": 440
      })
    : "";
  const sourceNode = source
    ? textNode(fitText(source, 150, size), {
        x: g.w - g.gut,
        y: g.footerY,
        fill: theme.soft,
        "font-size": size,
        "font-family": FONT,
        "font-weight": 440,
        "text-anchor": "end"
      })
    : "";
  return captionNode + sourceNode;
}

export function niceTicks(max: number, count = 4): { ticks: number[]; max: number } {
  if (max <= 0) return { ticks: [0], max: 1 };
  const rawStep = max / count;
  const magnitude = Math.pow(10, Math.floor(Math.log10(rawStep)));
  const normalized = rawStep / magnitude;
  const step = (normalized <= 1 ? 1 : normalized <= 2 ? 2 : normalized <= 2.5 ? 2.5 : normalized <= 5 ? 5 : 10) * magnitude;
  const niceMax = Math.ceil(max / step) * step;
  const ticks: number[] = [];
  for (let value = 0; value <= niceMax + step * 0.5; value += step) ticks.push(round(value));
  return { ticks, max: niceMax };
}

export function yAxisGrid(plot: Rect, theme: VisualTheme, ticks: number[], tickMax: number, g: Geom): string {
  return ticks
    .map((tick, index) => {
      const y = round(plot.y + plot.height - (tick / tickMax) * plot.height);
      const isBaseline = index === 0;
      return (
        line({
          x1: plot.x,
          x2: plot.x + plot.width,
          y1: y,
          y2: y,
          stroke: isBaseline ? theme.axis : theme.grid,
          "stroke-width": isBaseline ? 1.2 : 1,
          "stroke-dasharray": isBaseline ? undefined : "3 5"
        }) +
        textNode(formatCompact(tick), {
          x: plot.x - Math.round(12 * g.s),
          y: y + 4,
          fill: theme.soft,
          "font-size": Math.round(12 * g.s),
          "font-family": FONT,
          "text-anchor": "end"
        })
      );
    })
    .join("");
}

export function legendRow(items: Array<{ label: string; color: string }>, theme: VisualTheme, g: Geom, y: number): string {
  const size = Math.round(13 * g.s);
  const widths = items.map((item) => estTextWidth(item.label, size) + Math.round(26 * g.s));
  const total = widths.reduce((sum, value) => sum + value, 0);
  let cursor = g.w / 2 - total / 2;
  return items
    .map((item, index) => {
      const x = cursor;
      cursor += widths[index];
      return (
        rect({ x: round(x), y: y - size + 2, width: Math.round(14 * g.s), height: Math.round(14 * g.s), rx: Math.round(4 * g.s), fill: item.color }) +
        textNode(item.label, {
          x: round(x + Math.round(20 * g.s)),
          y,
          fill: theme.muted,
          "font-size": size,
          "font-family": FONT,
          "font-weight": 560
        })
      );
    })
    .join("");
}

export function axisLabel(text: string, x: number, y: number, theme: VisualTheme, g: Geom, anchor = "middle"): string {
  return textNode(text, {
    x: round(x),
    y: round(y),
    fill: theme.muted,
    "font-size": Math.round(12.5 * g.s),
    "font-family": FONT,
    "text-anchor": anchor
  });
}

export function valueLabel(text: string, x: number, y: number, fill: string, g: Geom, delay: number, duration: number, anchor = "middle"): string {
  return textNode(
    text,
    {
      x: round(x),
      y: round(y),
      fill,
      opacity: 1,
      "font-size": Math.round(12.5 * g.s),
      "font-family": FONT,
      "font-weight": 680,
      "text-anchor": anchor
    },
    animate("opacity", 0, 1, 320, delay + duration - 140, { easing: "ease-out" })
  );
}

export function multilineAxisLabel(
  value: string,
  x: number,
  y: number,
  slot: number,
  theme: VisualTheme,
  g: Geom
): string {
  const size = Math.round(clamp(slot < 22 ? 10 : 12.5, 9, 13) * g.s);
  const available = Math.max(14, slot * 0.9);
  const label = value.trim();
  if (!label) return "";
  if (estTextWidth(label, size) <= available) return axisLabel(label, x, y, theme, g);
  const split = splitLabel(label);
  if (split && split.every((part) => estTextWidth(part, size) <= available)) {
    const tspans = split
      .map((part, index) => tag("tspan", { x: round(x), dy: index === 0 ? 0 : Math.round(size + 2) }, escapeText(part)))
      .join("");
    return tag(
      "text",
      { x: round(x), y: round(y), fill: theme.muted, "font-size": size, "font-family": FONT, "text-anchor": "middle" },
      tspans
    );
  }
  return axisLabel(fitText(label, available, size), x, y, theme, g);
}

function splitLabel(label: string): string[] | null {
  const clean = label.trim();
  if ([...clean].length <= 2) return null;
  const separator = clean.match(/^(.+?)[\s/_-]+(.+)$/);
  if (separator?.[1] && separator[2]) return [separator[1], separator[2]];
  const chars = [...clean];
  const mid = Math.ceil(chars.length / 2);
  return [chars.slice(0, mid).join(""), chars.slice(mid).join("")].filter(Boolean);
}

export function shortMonth(label: string): string {
  const match = label.match(/(?:^|[-/])(\d{1,2})$/);
  return match ? match[1].padStart(2, "0") : label;
}

export function wrapText(text: string, available: number, fontSize: number, maxLines: number): string[] {
  const chars = [...text.trim()];
  if (!chars.length) return [""];
  if (maxLines <= 1) return [fitText(text, available, fontSize)];
  const lines: string[] = [];
  let current = "";
  chars.forEach((char) => {
    const next = current + char;
    if (current && estTextWidth(next, fontSize) > available && lines.length < maxLines - 1) {
      lines.push(current);
      current = char;
      return;
    }
    current = next;
  });
  if (current) lines.push(current);
  if (lines.length <= maxLines) return lines;
  const kept = lines.slice(0, maxLines);
  kept[maxLines - 1] = fitText(kept[maxLines - 1], available, fontSize);
  return kept;
}

export function fitText(text: string, available: number, fontSize: number): string {
  if (estTextWidth(text, fontSize) <= available) return text;
  const suffix = "…";
  let output = "";
  for (const char of [...text]) {
    if (estTextWidth(output + char + suffix, fontSize) > available) break;
    output += char;
  }
  return output ? `${output}${suffix}` : suffix;
}

export function estTextWidth(value: string, fontSize: number): number {
  return [...value].reduce((width, char) => width + estCharWidth(char, fontSize), 0);
}

function estCharWidth(char: string, fontSize: number): number {
  if (/[\u2e80-\u9fff\uff00-\uffef]/u.test(char)) return fontSize;
  if (/\s/u.test(char)) return fontSize * 0.34;
  if (/[A-Z0-9]/u.test(char)) return fontSize * 0.62;
  if (/[a-z]/u.test(char)) return fontSize * 0.54;
  return fontSize * 0.5;
}

function escapeText(value: string): string {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

export function formatMetricValue(value: string | number, prefix?: string, suffix?: string): string {
  const base = typeof value === "number" ? value.toLocaleString("en-US") : value;
  return `${prefix ?? ""}${base}${suffix ?? ""}`;
}

export function metricTrend(metric: CardMetric): { text: string; fill: string } | null {
  if (metric.delta === undefined || metric.delta === null || metric.delta === "") return null;
  if (!metric.trend) return null;
  const icon = metric.trend === "down" ? "↓" : metric.trend === "neutral" ? "→" : "↑";
  const fill = metric.trend === "down" ? "#e05a5a" : metric.trend === "neutral" ? "#8a93a4" : "#1aa06a";
  return { text: `${icon} ${metric.delta}`, fill };
}

/* ---------- color utilities ---------- */

export type Rgb = { r: number; g: number; b: number };

export function hexToRgb(hex: string): Rgb {
  const value = (hex.trim().replace(/^#/, "") || "3b6ef5").padEnd(6, "0").slice(0, 6);
  return {
    r: parseInt(value.slice(0, 2), 16) || 0,
    g: parseInt(value.slice(2, 4), 16) || 0,
    b: parseInt(value.slice(4, 6), 16) || 0
  };
}

export function rgbToHex({ r, g, b }: Rgb): string {
  return `#${[r, g, b].map((channel) => clamp(Math.round(channel), 0, 255).toString(16).padStart(2, "0")).join("")}`;
}

export function mix(a: string, b: string, ratio: number): string {
  const ca = hexToRgb(a);
  const cb = hexToRgb(b);
  const t = clamp(ratio, 0, 1);
  return rgbToHex({ r: ca.r + (cb.r - ca.r) * t, g: ca.g + (cb.g - ca.g) * t, b: ca.b + (cb.b - ca.b) * t });
}

export function lighten(hex: string, amount: number): string {
  return mix(hex, "#ffffff", amount);
}

export function darken(hex: string, amount: number): string {
  return mix(hex, "#000000", amount);
}

export function readableOn(hex: string): string {
  const { r, g, b } = hexToRgb(hex);
  const luminance = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
  return luminance > 0.6 ? "#10182b" : "#ffffff";
}

export function fillFor(theme: VisualTheme, index: number): string {
  const count = Math.min(theme.palette.length, GRADIENT_CAP);
  if (index < count) return `url(#vizGrad${index})`;
  return theme.palette[index % theme.palette.length] ?? theme.accent;
}

export function colorFor(theme: VisualTheme, index: number): string {
  return theme.palette[index % theme.palette.length] ?? theme.accent;
}

export const GRADIENT_CAP = 48;

export { group, rect, path, line, textNode };
