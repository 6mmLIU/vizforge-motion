import { coerceNumber } from "@/lib/data/inferSchema";
import { animate, animateTransform, circle, group, line, rect, textNode } from "@/lib/motion/svgPrimitives";
import { resolveFields } from "@/lib/motion/renderUtils";
import { stagger } from "@/lib/motion/timeline";
import { FONT, axisLabel, clamp, colorFor, niceTicks, round, yAxisGrid, type Geom, type Rect } from "@/lib/motion/layout";
import type { VisualSpec } from "@/lib/visual/visualSpec";
import type { VisualTheme } from "@/lib/visual/themes";

function scale(value: number, min: number, max: number, start: number, size: number) {
  if (max === min) return start + size / 2;
  return start + ((value - min) / (max - min)) * size;
}

export function renderScatter(spec: VisualSpec, theme: VisualTheme, g: Geom): string {
  const fields = resolveFields(spec);
  const rows = spec.data.rows.slice(0, 200);
  const xField = spec.mappings?.x ?? fields.category;
  const yField = spec.mappings?.y ?? fields.value;
  const xAxis = resolveXAxis(rows.map((row, index) => ({ value: row[xField], index })));
  const points = rows
    .map((row, index) => ({
      label: String(row[fields.category] ?? `点 ${index + 1}`),
      x: xAxis.values[index] ?? index,
      y: coerceNumber(row[yField]) ?? coerceNumber(row[fields.value]) ?? 0,
      size: coerceNumber(row[fields.value]) ?? 1
    }))
    .filter((point) => Number.isFinite(point.x) && Number.isFinite(point.y));
  if (!points.length) {
    return group(
      rect({ x: round(g.plot.x), y: round(g.plot.y), width: round(g.plot.width), height: round(g.plot.height), rx: round(12 * g.s), fill: theme.header, stroke: theme.border, "stroke-width": 1, "stroke-dasharray": "6 6" }) +
        textNode("暂无可绘制的数值点", {
          x: round(g.plot.x + g.plot.width / 2),
          y: round(g.plot.y + g.plot.height / 2),
          fill: theme.muted,
          "font-size": Math.round(15 * g.s),
          "font-family": FONT,
          "font-weight": 600,
          "text-anchor": "middle"
        })
    );
  }

  const leftAxis = round(clamp(40 * g.s, 32, 54));
  const labelBand = round(34 * g.s);
  const plot: Rect = {
    x: g.plot.x + leftAxis,
    y: g.plot.y + 10,
    width: g.plot.width - leftAxis,
    height: g.plot.height - labelBand - 10
  };

  const yValues = points.map((point) => point.y);
  const sizeValues = points.map((point) => Math.abs(point.size));
  const rawMinX = Math.min(...points.map((p) => p.x));
  const rawMaxX = Math.max(...points.map((p) => p.x));
  const minX = xAxis.includeZero ? Math.min(rawMinX, 0) : rawMinX;
  const maxX = rawMaxX === rawMinX ? rawMaxX + 1 : rawMaxX;
  const maxY = Math.max(...yValues, 1);
  const maxSize = Math.max(...sizeValues, 1);
  const { ticks, max: tickMax } = niceTicks(maxY);
  const labelIndices = resolveLabelIndices(points);

  const grid = yAxisGrid(plot, theme, ticks, tickMax, g);
  const axisFrame = line({
    x1: plot.x,
    x2: plot.x + plot.width,
    y1: round(plot.y + plot.height),
    y2: round(plot.y + plot.height),
    stroke: theme.axis,
    "stroke-width": 1.2
  });

  const circles = points
    .map((point, index) => {
      const x = scale(point.x, minX, maxX, plot.x, plot.width);
      const y = plot.y + plot.height - (Math.max(0, point.y) / tickMax) * plot.height;
      const radius = spec.type === "bubble" ? 8 + (Math.abs(point.size) / maxSize) * (g.tall ? 32 : 22) : g.tall ? 9 : 7;
      const delay = stagger(index, spec.motion.delayMs, Math.max(16, spec.motion.staggerMs * 0.3));
      const showLabel = labelIndices.has(index);
      const labelX = clamp(x + radius + 8, plot.x + 8, plot.x + plot.width - 8) - x;
      const anchor = labelX <= 0 ? "end" : "start";
      return group(
        group(
          circle({
            cx: 0,
            cy: 0,
            r: round(radius),
            fill: colorFor(theme, index),
            opacity: spec.type === "bubble" ? 0.78 : 0.88,
            stroke: theme.surface,
            "stroke-width": 2
          }) +
            (showLabel
              ? textNode(point.label.slice(0, 10), {
                  x: round(labelX),
                  y: round(radius > 16 ? radius + 8 : -radius - 7),
                  fill: theme.text,
                  "font-size": Math.round((g.tall ? 13 : 11.5) * g.s),
                  "font-family": FONT,
                  "font-weight": 640,
                  "text-anchor": anchor
                })
              : "") +
            animateTransform("scale", 0, 1, spec.motion.durationMs, delay, spec.motion),
          { transform: "scale(1)" }
        ),
        { transform: `translate(${x.toFixed(2)} ${y.toFixed(2)})` }
      );
    })
    .join("");

  const xLabels =
    axisLabel(xAxis.startLabel, plot.x, plot.y + plot.height + round(26 * g.s), theme, g, "start") +
    axisLabel(xAxis.endLabel, plot.x + plot.width, plot.y + plot.height + round(26 * g.s), theme, g, "end");

  return grid + axisFrame + circles + xLabels;
}

function resolveLabelIndices(points: Array<{ y: number }>): Set<number> {
  if (points.length <= 8) return new Set(points.map((_, index) => index));
  const indices = new Set<number>([0, points.length - 1]);
  const step = Math.ceil(points.length / 5);
  for (let index = 0; index < points.length; index += step) indices.add(index);
  let maxIndex = 0;
  let minIndex = 0;
  points.forEach((point, index) => {
    if (point.y > points[maxIndex].y) maxIndex = index;
    if (point.y < points[minIndex].y) minIndex = index;
  });
  indices.add(maxIndex);
  indices.add(minIndex);
  return indices;
}

function resolveXAxis(items: Array<{ value: unknown; index: number }>) {
  const numbers = items.map((item) => strictNumber(item.value));
  const numericCount = numbers.filter((value): value is number => value !== null).length;
  if (numericCount >= Math.max(2, Math.ceil(items.length * 0.7))) {
    const present = numbers.filter((value): value is number => value !== null);
    return {
      values: numbers.map((value, index) => value ?? index),
      startLabel: formatAxisValue(Math.min(...present)),
      endLabel: formatAxisValue(Math.max(...present)),
      includeZero: true
    };
  }
  const dates = items.map((item) => parseDateValue(item.value));
  const dateCount = dates.filter((value): value is number => value !== null).length;
  if (dateCount >= Math.max(2, Math.ceil(items.length * 0.7))) {
    return {
      values: dates.map((value, index) => value ?? index),
      startLabel: labelForAxis(items[0]?.value, "起点"),
      endLabel: labelForAxis(items[items.length - 1]?.value, "终点"),
      includeZero: false
    };
  }
  return {
    values: items.map((item) => item.index),
    startLabel: labelForAxis(items[0]?.value, "起点"),
    endLabel: labelForAxis(items[items.length - 1]?.value, "终点"),
    includeZero: false
  };
}

function strictNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  const text = String(value ?? "").trim().replace(/,/g, "");
  if (!/^-?\d+(?:\.\d+)?%?$/.test(text)) return null;
  const numeric = Number(text.replace(/%$/, ""));
  if (!Number.isFinite(numeric)) return null;
  return text.endsWith("%") ? numeric * 0.01 : numeric;
}

function parseDateValue(value: unknown): number | null {
  const text = String(value ?? "").trim();
  const match = text.match(/^(\d{4})[-/](\d{1,2})(?:[-/](\d{1,2}))?$/);
  if (!match) return null;
  const normalized = `${match[1]}-${match[2].padStart(2, "0")}-${(match[3] ?? "1").padStart(2, "0")}`;
  const time = Date.parse(normalized);
  return Number.isFinite(time) ? time : null;
}

function labelForAxis(value: unknown, fallback: string) {
  const text = String(value ?? "").trim();
  return text ? text.slice(0, 12) : fallback;
}

function formatAxisValue(value: number) {
  return Number.isInteger(value) ? value.toLocaleString("en-US") : value.toLocaleString("en-US", { maximumFractionDigits: 1 });
}
