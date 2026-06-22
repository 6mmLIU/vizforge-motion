import { coerceNumber } from "@/lib/data/inferSchema";
import { stagger } from "@/lib/motion/timeline";
import { animate, group, rect } from "@/lib/motion/svgPrimitives";
import { extractPoints, maxAbs, resolveFields, type Point } from "@/lib/motion/renderUtils";
import {
  clamp,
  colorFor,
  fillFor,
  formatCompact,
  legendRow,
  multilineAxisLabel,
  niceTicks,
  round,
  shortMonth,
  valueLabel,
  yAxisGrid,
  type Geom,
  type Rect
} from "@/lib/motion/layout";
import type { VisualSpec } from "@/lib/visual/visualSpec";
import type { VisualTheme } from "@/lib/visual/themes";

function barPlot(g: Geom, topReserve = 0): Rect {
  const leftAxis = round(clamp(40 * g.s, 32, 54));
  const labelBand = round(34 * g.s);
  return {
    x: g.plot.x + leftAxis,
    y: g.plot.y + 10 + topReserve,
    width: g.plot.width - leftAxis,
    height: g.plot.height - labelBand - 10 - topReserve
  };
}

export function renderBar(spec: VisualSpec, theme: VisualTheme, g: Geom): string {
  const points = extractPoints(spec, 200);
  const plot = barPlot(g);
  const max = maxAbs(points);
  const { ticks, max: tickMax } = niceTicks(max);
  const band = barBandLayout(plot.x, plot.width, points.length);
  const baseY = plot.y + plot.height;
  const grid = yAxisGrid(plot, theme, ticks, tickMax, g);

  const bars = points
    .map((point, index) => {
      const value = Math.max(0, point.value);
      const barHeight = Math.max(2, (value / tickMax) * plot.height);
      const x = band.startX + index * band.slot;
      const y = baseY - barHeight;
      const delay = stagger(index, spec.motion.delayMs, Math.max(36, spec.motion.staggerMs));
      const showValue = points.length <= 16 && barHeight > 18;
      return group(
        rect(
          {
            x: round(x),
            y: round(y),
            width: round(band.barWidth),
            height: round(barHeight),
            rx: Math.min(theme.barRadius, round(band.barWidth * 0.42)),
            fill: fillFor(theme, index)
          },
          animate("height", 0, round(barHeight), spec.motion.durationMs, delay, spec.motion) +
            animate("y", baseY, round(y), spec.motion.durationMs, delay, spec.motion)
        ) +
          (showValue ? valueLabel(formatCompact(value), x + band.barWidth / 2, y - 9, theme.strong, g, delay, spec.motion.durationMs) : "") +
          multilineAxisLabel(shortMonth(point.label || String(index + 1)), x + band.barWidth / 2, baseY + round(26 * g.s), band.slot, theme, g)
      );
    })
    .join("");

  return grid + bars;
}

export function renderStackedBar(spec: VisualSpec, theme: VisualTheme, g: Geom): string {
  const stacks = buildStacks(spec);
  if (stacks.seriesNames.length < 2) return renderBar(spec, theme, g);

  const legendItems = stacks.seriesNames.map((name, index) => ({ label: name, color: colorFor(theme, index) }));
  const legendY = g.plot.y + round(16 * g.s);
  const plot = barPlot(g, round(30 * g.s));
  const max = Math.max(...stacks.columns.map((column) => column.total), 1);
  const { ticks, max: tickMax } = niceTicks(max);
  const band = barBandLayout(plot.x, plot.width, stacks.columns.length);
  const baseY = plot.y + plot.height;
  const grid = yAxisGrid(plot, theme, ticks, tickMax, g);

  const bars = stacks.columns
    .map((column, index) => {
      const x = band.startX + index * band.slot;
      const delay = stagger(index, spec.motion.delayMs, Math.max(40, spec.motion.staggerMs));
      let cursorY = baseY;
      const segments = column.values
        .map((value, seriesIndex) => {
          const segHeight = Math.max(0, (Math.max(0, value) / tickMax) * plot.height);
          if (segHeight <= 0) return "";
          cursorY -= segHeight;
          const isTop = seriesIndex === column.values.length - 1 || column.values.slice(seriesIndex + 1).every((v) => v <= 0);
          return rect(
            {
              x: round(x),
              y: round(cursorY),
              width: round(band.barWidth),
              height: round(segHeight),
              rx: isTop ? Math.min(theme.barRadius, round(band.barWidth * 0.42)) : 0,
              fill: fillFor(theme, seriesIndex)
            },
            animate("height", 0, round(segHeight), spec.motion.durationMs, delay + seriesIndex * 60, spec.motion) +
              animate("y", baseY, round(cursorY), spec.motion.durationMs, delay + seriesIndex * 60, spec.motion)
          );
        })
        .join("");
      return group(
        segments +
          multilineAxisLabel(shortMonth(column.label), x + band.barWidth / 2, baseY + round(26 * g.s), band.slot, theme, g)
      );
    })
    .join("");

  return legendRow(legendItems, theme, g, legendY) + grid + bars;
}

type Stacks = {
  seriesNames: string[];
  columns: Array<{ label: string; values: number[]; total: number }>;
};

function buildStacks(spec: VisualSpec): Stacks {
  const fields = resolveFields(spec);
  const rows = spec.data.rows.slice(0, 400);
  const xField = spec.mappings?.x ?? fields.category;
  const yField = spec.mappings?.value ?? spec.mappings?.y ?? fields.value;
  const seriesField = spec.mappings?.series;

  if (seriesField && seriesField !== xField) {
    const labels: string[] = [];
    const seriesNames: string[] = [];
    const matrix = new Map<string, Map<string, number>>();
    rows.forEach((row, index) => {
      const label = String(row[xField] ?? `项 ${index + 1}`);
      const seriesName = String(row[seriesField] ?? "系列");
      const value = coerceNumber(row[yField]) ?? 0;
      if (!labels.includes(label)) labels.push(label);
      if (!seriesNames.includes(seriesName)) seriesNames.push(seriesName);
      const column = matrix.get(label) ?? new Map<string, number>();
      column.set(seriesName, (column.get(seriesName) ?? 0) + value);
      matrix.set(label, column);
    });
    const names = seriesNames.slice(0, 6);
    const columns = labels.slice(0, 60).map((label) => {
      const column = matrix.get(label) ?? new Map<string, number>();
      const values = names.map((name) => column.get(name) ?? 0);
      return { label, values, total: values.reduce((sum, value) => sum + Math.max(0, value), 0) };
    });
    return { seriesNames: names, columns };
  }

  const wide = numericFields(rows, new Set([xField]));
  if (wide.length >= 2) {
    const names = wide.slice(0, 6);
    const columns = rows.slice(0, 60).map((row, index) => {
      const values = names.map((field) => coerceNumber(row[field]) ?? 0);
      return {
        label: String(row[xField] ?? `项 ${index + 1}`),
        values,
        total: values.reduce((sum, value) => sum + Math.max(0, value), 0)
      };
    });
    return { seriesNames: names, columns };
  }

  return { seriesNames: [], columns: [] };
}

function numericFields(rows: VisualSpec["data"]["rows"], excluded: Set<string>): string[] {
  const keys = Array.from(new Set(rows.flatMap((row) => Object.keys(row))));
  return keys.filter((key) => !excluded.has(key) && rows.some((row) => coerceNumber(row[key]) !== null));
}

export function barBandLayout(plotX: number, plotWidth: number, count: number) {
  const safeCount = Math.max(1, count);
  const maxBar =
    safeCount <= 4 ? 64 : safeCount <= 8 ? 46 : safeCount <= 16 ? 30 : safeCount <= 32 ? 18 : safeCount <= 80 ? 9 : 4;
  const minBar = safeCount > 80 ? 1.5 : safeCount > 48 ? 3 : 6;
  const gapRatio = safeCount <= 4 ? 0.9 : safeCount <= 8 ? 0.7 : safeCount <= 16 ? 0.56 : safeCount <= 32 ? 0.46 : 0.34;
  const rawBar = plotWidth / (safeCount + Math.max(0, safeCount - 1) * gapRatio);
  let barWidth = clamp(rawBar, minBar, maxBar);
  if (barWidth * safeCount > plotWidth) barWidth = Math.max(1.5, (plotWidth / safeCount) * 0.8);
  const maxGapFit = safeCount > 1 ? Math.max(0, (plotWidth - safeCount * barWidth) / (safeCount - 1)) : 0;
  const gap = safeCount > 1 ? Math.max(1.5, Math.min(barWidth * gapRatio, maxGapFit)) : 0;
  const groupWidth = safeCount * barWidth + Math.max(0, safeCount - 1) * gap;
  const startX = plotX + Math.max(0, (plotWidth - groupWidth) / 2);
  return { startX, barWidth, gap, slot: barWidth + gap };
}
