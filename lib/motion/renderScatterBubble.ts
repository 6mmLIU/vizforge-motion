import { coerceNumber } from "@/lib/data/inferSchema";
import { animate, animateTransform, circle, group, line, textNode } from "@/lib/motion/svgPrimitives";
import { gridLines, resolveFields } from "@/lib/motion/renderUtils";
import { stagger } from "@/lib/motion/timeline";
import type { VisualSpec } from "@/lib/visual/visualSpec";
import type { VisualTheme } from "@/lib/visual/themes";

function scale(value: number, min: number, max: number, start: number, size: number) {
  if (max === min) return start + size / 2;
  return start + ((value - min) / (max - min)) * size;
}

export function renderScatterBubble(spec: VisualSpec, theme: VisualTheme): string {
  const fields = resolveFields(spec);
  const rows = spec.data.rows.slice(0, 200);
  const xField = spec.mappings?.x ?? fields.category;
  const yField = spec.mappings?.y ?? fields.value;
  const xAxis = resolveXAxis(rows.map((row, index) => ({ value: row[xField], index })));
  const points = rows
    .map((row, index) => ({
      label: String(row[fields.category] ?? `Point ${index + 1}`),
      x: xAxis.values[index] ?? index,
      y: coerceNumber(row[yField]) ?? coerceNumber(row[fields.value]) ?? 0,
      size: coerceNumber(row[fields.value]) ?? 1
    }))
    .filter((point) => Number.isFinite(point.x) && Number.isFinite(point.y));
  if (!points.length) return "";

  const tall = theme.id === "editorial-light" && spec.export.height / spec.export.width > 1.15;
  const plot = {
    x: tall ? 68 : 76,
    y: tall ? 224 : 132,
    width: spec.export.width - (tall ? 136 : 152),
    height: spec.export.height - (tall ? 384 : 232)
  };
  const xValues = points.map((point) => point.x);
  const yValues = points.map((point) => point.y);
  const sizeValues = points.map((point) => Math.abs(point.size));
  const rawMinX = Math.min(...xValues);
  const rawMaxX = Math.max(...xValues);
  const minX = xAxis.includeZero ? Math.min(rawMinX, 0) : rawMinX;
  const maxX = rawMaxX === rawMinX ? rawMaxX + 1 : xAxis.includeZero ? Math.max(rawMaxX, 1) : rawMaxX;
  const minY = Math.min(...yValues, 0);
  const maxY = Math.max(...yValues, 1);
  const maxSize = Math.max(...sizeValues, 1);
  const labelIndices = resolveLabelIndices(points);

  const circles = points
    .map((point, index) => {
      const x = scale(point.x, minX, maxX, plot.x, plot.width);
      const y = plot.y + plot.height - scale(point.y, minY, maxY, 0, plot.height);
      const radius = spec.type === "bubble" ? 8 + (Math.abs(point.size) / maxSize) * (tall ? 34 : 22) : tall ? 11 : 7;
      const delay = stagger(index, spec.motion.delayMs, Math.max(18, spec.motion.staggerMs * 0.3));
      const labelAbsoluteX = clamp(x + radius + 10, plot.x + 10, plot.x + plot.width - 10);
      const labelX = labelAbsoluteX - x;
      const labelAnchor = labelX <= 0 ? "end" : "start";
      const showLabel = labelIndices.has(index);
      return group(
        group(
          circle({
            cx: 0,
            cy: 0,
            r: Number(radius.toFixed(2)),
            fill: theme.palette[index % theme.palette.length],
            opacity: 0.82,
            stroke: theme.background,
            "stroke-width": 2
          }) +
            (showLabel
              ? textNode(point.label.slice(0, 10), {
                  x: Number(labelX.toFixed(2)),
                  y: Number((radius > 16 ? radius + 8 : -radius - 8).toFixed(2)),
                  fill: theme.text,
                  "font-size": tall ? 14 : 11,
                  "font-family": "Noto Sans CJK SC, PingFang SC, Microsoft YaHei, Arial, sans-serif",
                  "font-weight": 680,
                  "text-anchor": labelAnchor
                })
              : "") +
            animateTransform("scale", 0, 1, spec.motion.durationMs, delay, spec.motion),
          { transform: "scale(1)" }
        ),
        { transform: `translate(${x.toFixed(2)} ${y.toFixed(2)})` }
      );
    })
    .join("");

  const axes =
    textNode(xAxis.startLabel, { x: plot.x, y: plot.y + plot.height + 24, fill: theme.muted, "font-size": 12, "font-family": "Noto Sans CJK SC, PingFang SC, Microsoft YaHei, Arial, sans-serif" }) +
    textNode(xAxis.endLabel, { x: plot.x + plot.width, y: plot.y + plot.height + 24, fill: theme.muted, "font-size": 12, "font-family": "Noto Sans CJK SC, PingFang SC, Microsoft YaHei, Arial, sans-serif", "text-anchor": "end" }) +
    textNode(String(maxY), { x: plot.x - 10, y: plot.y + 4, fill: theme.muted, "font-size": 12, "font-family": "Noto Sans CJK SC, PingFang SC, Microsoft YaHei, Arial, sans-serif", "text-anchor": "end" });

  const axisColor = theme.id === "editorial-light" ? "#dbe3ee" : theme.text;
  const axisOpacity = theme.id === "editorial-light" ? 1 : theme.axisOpacity;
  const axesFrame =
    line({
      x1: plot.x,
      x2: plot.x + plot.width,
      y1: plot.y + plot.height,
      y2: plot.y + plot.height,
      stroke: axisColor,
      "stroke-width": theme.id === "editorial-light" ? 1.3 : 1,
      opacity: axisOpacity
    }) +
    line({
      x1: plot.x,
      x2: plot.x,
      y1: plot.y,
      y2: plot.y + plot.height,
      stroke: axisColor,
      "stroke-width": theme.id === "editorial-light" ? 1.3 : 1,
      opacity: axisOpacity
    });

  return gridLines(plot, theme) + axesFrame + circles + axes;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function resolveLabelIndices(points: Array<{ y: number }>): Set<number> {
  if (points.length <= 8) return new Set(points.map((_, index) => index));

  const indices = new Set<number>([0, points.length - 1]);
  const step = Math.ceil(points.length / 5);
  for (let index = 0; index < points.length; index += step) {
    indices.add(index);
  }

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
  const strictNumbers = items.map((item) => strictNumber(item.value));
  const numericCount = strictNumbers.filter((value): value is number => value !== null).length;
  if (numericCount >= Math.max(2, Math.ceil(items.length * 0.7))) {
    return {
      values: strictNumbers.map((value, index) => value ?? index),
      startLabel: formatAxisValue(Math.min(...strictNumbers.filter((value): value is number => value !== null))),
      endLabel: formatAxisValue(Math.max(...strictNumbers.filter((value): value is number => value !== null))),
      includeZero: true
    };
  }

  const dates = items.map((item) => parseDateValue(item.value));
  const dateCount = dates.filter((value): value is number => value !== null).length;
  if (dateCount >= Math.max(2, Math.ceil(items.length * 0.7))) {
    const values = dates.map((value, index) => value ?? index);
    return {
      values,
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
  return Number.isInteger(value) ? value.toLocaleString("zh-CN") : value.toLocaleString("zh-CN", { maximumFractionDigits: 1 });
}
