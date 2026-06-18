import { coerceNumber } from "@/lib/data/inferSchema";
import { rect, tag } from "@/lib/motion/svgPrimitives";
import type { DataRow, FieldMapping, VisualSpec } from "@/lib/visual/visualSpec";
import type { VisualTheme } from "@/lib/visual/themes";

export type Point = {
  label: string;
  value: number;
  raw: DataRow;
};

export function chartFrame(width: number, height: number, theme: VisualTheme): string {
  if (theme.id === "editorial-light") {
    return rect({
      x: 16,
      y: 16,
      width: width - 32,
      height: height - 32,
      rx: 24,
      fill: theme.surface,
      stroke: theme.border,
      "stroke-width": 1
    });
  }

  const inset = rect({
    x: 28,
    y: 22,
    width: width - 56,
    height: height - 44,
    rx: 24,
    fill: theme.surface,
    stroke: theme.border,
    "stroke-width": 1.2,
    opacity: 0.94
  });

  const glow = theme.glow
    ? rect({
        x: 0,
        y: 0,
        width,
        height,
        fill: "url(#vizforgeGlow)",
        opacity: 0.55
      })
    : "";

  return glow + inset;
}

export function gridLines(plot: { x: number; y: number; width: number; height: number }, theme: VisualTheme): string {
  const lines: string[] = [];
  for (let index = 0; index <= 4; index += 1) {
    const y = plot.y + (plot.height / 4) * index;
    const dashboard = theme.id === "editorial-light";
    lines.push(
      tag("line", {
        x1: plot.x,
        x2: plot.x + plot.width,
        y1: Number(y.toFixed(2)),
        y2: Number(y.toFixed(2)),
        stroke: dashboard ? "#e5e7eb" : theme.text,
        "stroke-width": dashboard ? 0.9 : 1,
        opacity: dashboard ? 1 : theme.gridOpacity
      })
    );
  }
  return lines.join("");
}

export function resolveFields(spec: VisualSpec): Required<Pick<FieldMapping, "category" | "value">> & FieldMapping {
  const rows = spec.data.rows;
  const sample = rows[0] ?? {};
  const keys = Object.keys(sample);
  const mappedCategory = spec.mappings?.category ?? spec.mappings?.x;
  const mappedValue = spec.mappings?.value ?? spec.mappings?.y;
  const value =
    mappedValue ??
    keys.find((key) => rows.some((row) => coerceNumber(row[key]) !== null)) ??
    keys[0] ??
    "value";
  const category = mappedCategory ?? keys.find((key) => key !== value) ?? value;

  return {
    ...spec.mappings,
    category,
    value
  };
}

export function extractPoints(spec: VisualSpec, limit: number): Point[] {
  const fields = resolveFields(spec);
  return spec.data.rows.slice(0, limit).map((row, index) => ({
    label: labelFor(row[fields.category], index),
    value: coerceNumber(row[fields.value]) ?? 0,
    raw: row
  }));
}

export function extractAggregatedPoints(spec: VisualSpec, limit: number): Point[] {
  const fields = resolveFields(spec);
  const groups = new Map<string, Point>();

  spec.data.rows.forEach((row, index) => {
    const label = labelFor(row[fields.category], index);
    const value = coerceNumber(row[fields.value]) ?? 0;
    const current = groups.get(label);

    if (current) {
      current.value += value;
      return;
    }

    groups.set(label, { label, value, raw: row });
  });

  return Array.from(groups.values()).slice(0, limit);
}

function labelFor(value: DataRow[string] | undefined, index: number): string {
  const text = value === undefined || value === null ? "" : String(value).trim();
  return text || `Item ${index + 1}`;
}

export function maxAbs(points: Point[]): number {
  const max = Math.max(...points.map((point) => Math.abs(point.value)), 0);
  return max === 0 ? 1 : max;
}

export function totalPositive(points: Point[]): number {
  const total = points.reduce((sum, point) => sum + Math.max(0, point.value), 0);
  return total === 0 ? 1 : total;
}

export function polarToCartesian(cx: number, cy: number, r: number, angleDeg: number) {
  const angle = ((angleDeg - 90) * Math.PI) / 180;
  return {
    x: cx + r * Math.cos(angle),
    y: cy + r * Math.sin(angle)
  };
}

export function describeArc(cx: number, cy: number, r: number, startAngle: number, endAngle: number): string {
  const start = polarToCartesian(cx, cy, r, endAngle);
  const end = polarToCartesian(cx, cy, r, startAngle);
  const largeArcFlag = endAngle - startAngle <= 180 ? 0 : 1;
  return `M ${start.x.toFixed(3)} ${start.y.toFixed(3)} A ${r} ${r} 0 ${largeArcFlag} 0 ${end.x.toFixed(3)} ${end.y.toFixed(3)}`;
}
