import { coerceNumber } from "@/lib/data/inferSchema";
import { resolveFields, type Point } from "@/lib/motion/renderUtils";
import { colorFor } from "@/lib/motion/layout";
import type { VisualSpec } from "@/lib/visual/visualSpec";
import type { VisualTheme } from "@/lib/visual/themes";

export type Series = {
  name: string;
  color: string;
  points: Point[];
};

export type SeriesBundle = {
  series: Series[];
  labels: string[];
  multi: boolean;
};

export function buildSeries(spec: VisualSpec, theme: VisualTheme): SeriesBundle {
  const fields = resolveFields(spec);
  const rows = spec.data.rows.slice(0, 400);
  const xField = spec.mappings?.x ?? fields.category;
  const yField = spec.mappings?.value ?? spec.mappings?.y ?? fields.value;
  const seriesField = spec.mappings?.series;
  const labels = uniqueOrdered(rows.map((row, index) => String(row[xField] ?? `项 ${index + 1}`)));

  if (seriesField && seriesField !== xField) {
    const groups = new Map<string, Map<string, Point>>();
    rows.forEach((row, index) => {
      const label = String(row[xField] ?? `项 ${index + 1}`);
      const value = coerceNumber(row[yField]) ?? 0;
      const name = String(row[seriesField] ?? "系列");
      const map = groups.get(name) ?? new Map<string, Point>();
      const current = map.get(label);
      if (current) current.value += value;
      else map.set(label, { label, value, raw: row });
      groups.set(name, map);
    });
    const eligible = Array.from(groups.entries()).slice(0, 6);
    if (eligible.length >= 2) {
      return {
        series: eligible.map(([name, map], index) => ({
          name,
          color: colorFor(theme, index),
          points: labels.map((label) => map.get(label) ?? { label, value: 0, raw: {} })
        })),
        labels,
        multi: true
      };
    }
  }

  const wide = numericFields(rows, new Set([xField, seriesField ?? ""]));
  if (wide.length >= 2) {
    return {
      series: wide.slice(0, 5).map((field, index) => ({
        name: field,
        color: colorFor(theme, index),
        points: labels.map((label) => {
          const matching = rows.filter((row, rowIndex) => String(row[xField] ?? `项 ${rowIndex + 1}`) === label);
          const value = matching.reduce((sum, row) => sum + (coerceNumber(row[field]) ?? 0), 0);
          return { label, value, raw: matching[0] ?? {} };
        })
      })),
      labels,
      multi: true
    };
  }

  const totals = new Map<string, Point>();
  rows.forEach((row, index) => {
    const label = String(row[xField] ?? `项 ${index + 1}`);
    const value = coerceNumber(row[yField]) ?? 0;
    const current = totals.get(label);
    if (current) current.value += value;
    else totals.set(label, { label, value, raw: row });
  });

  return {
    series: [{ name: spec.title || "数值", color: theme.accent, points: Array.from(totals.values()).slice(0, 200) }],
    labels: Array.from(totals.keys()).slice(0, 200),
    multi: false
  };
}

function uniqueOrdered(values: string[]): string[] {
  return Array.from(new Set(values));
}

function numericFields(rows: VisualSpec["data"]["rows"], excluded: Set<string>): string[] {
  const keys = Array.from(new Set(rows.flatMap((row) => Object.keys(row))));
  return keys.filter((key) => !excluded.has(key) && rows.some((row) => coerceNumber(row[key]) !== null));
}

export function smoothPath(coordinates: Array<{ x: number; y: number }>): string {
  if (coordinates.length <= 2) return straightPath(coordinates);
  return coordinates
    .map((point, index) => {
      if (index === 0) return `M ${point.x.toFixed(2)} ${point.y.toFixed(2)}`;
      const previous = coordinates[index - 1];
      const prevPrev = coordinates[index - 2] ?? previous;
      const next = coordinates[index + 1] ?? point;
      const tension = 0.2;
      const cp1x = previous.x + (point.x - prevPrev.x) * tension;
      const cp1y = previous.y + (point.y - prevPrev.y) * tension;
      const cp2x = point.x - (next.x - previous.x) * tension;
      const cp2y = point.y - (next.y - previous.y) * tension;
      return `C ${cp1x.toFixed(2)} ${cp1y.toFixed(2)} ${cp2x.toFixed(2)} ${cp2y.toFixed(2)} ${point.x.toFixed(2)} ${point.y.toFixed(2)}`;
    })
    .join(" ");
}

export function straightPath(coordinates: Array<{ x: number; y: number }>): string {
  return coordinates.map((coord, index) => `${index === 0 ? "M" : "L"} ${coord.x.toFixed(2)} ${coord.y.toFixed(2)}`).join(" ");
}

export function tickIndexes(length: number): number[] {
  if (length <= 1) return [0];
  if (length <= 8) return Array.from({ length }, (_, index) => index);
  const indexes = new Set<number>([0, length - 1]);
  const slots = 5;
  for (let index = 1; index < slots; index += 1) indexes.add(Math.round(((length - 1) * index) / slots));
  return Array.from(indexes).sort((a, b) => a - b);
}
