import { coerceNumber } from "@/lib/data/inferSchema";
import { animate, animateTransform, circle, group, path, textNode } from "@/lib/motion/svgPrimitives";
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
  const points = rows
    .map((row, index) => ({
      label: String(row[fields.category] ?? `Point ${index + 1}`),
      x: coerceNumber(row[xField]) ?? index,
      y: coerceNumber(row[yField]) ?? coerceNumber(row[fields.value]) ?? 0,
      size: coerceNumber(row[fields.value]) ?? 1
    }))
    .filter((point) => Number.isFinite(point.x) && Number.isFinite(point.y));

  const plot = { x: 76, y: 132, width: spec.export.width - 152, height: spec.export.height - 232 };
  const xValues = points.map((point) => point.x);
  const yValues = points.map((point) => point.y);
  const sizeValues = points.map((point) => Math.abs(point.size));
  const minX = Math.min(...xValues, 0);
  const maxX = Math.max(...xValues, 1);
  const minY = Math.min(...yValues, 0);
  const maxY = Math.max(...yValues, 1);
  const maxSize = Math.max(...sizeValues, 1);
  const labelLimit = points.length <= 12 ? points.length : 0;

  const circles = points
    .map((point, index) => {
      const x = scale(point.x, minX, maxX, plot.x, plot.width);
      const y = plot.y + plot.height - scale(point.y, minY, maxY, 0, plot.height);
      const radius = spec.type === "bubble" ? 5 + (Math.abs(point.size) / maxSize) * 20 : 6;
      const labelOnLeft = x > plot.x + plot.width * 0.76;
      const labelX = Math.max(plot.x + 18, Math.min(plot.x + plot.width - 18, x + (labelOnLeft ? -radius - 9 : radius + 9)));
      const labelY = Math.max(plot.y + 16, Math.min(plot.y + plot.height - 8, y - radius - 7));
      const delay = stagger(index, spec.motion.delayMs, Math.max(18, spec.motion.staggerMs * 0.3));
      const marker = group(
        group(
          circle({
            cx: 0,
            cy: 0,
            r: Number(radius.toFixed(2)),
            fill: theme.palette[index % theme.palette.length],
            opacity: 0.82,
            stroke: theme.background,
            "stroke-width": 2
          }) + animateTransform("scale", 0, 1, spec.motion.durationMs, delay, spec.motion),
          { transform: "scale(1)" }
        ),
        { transform: `translate(${x.toFixed(2)} ${y.toFixed(2)})` }
      );

      if (index >= labelLimit) return marker;
      return (
        marker +
        textNode(point.label.slice(0, 8), {
          x: Number(labelX.toFixed(2)),
          y: Number(labelY.toFixed(2)),
          fill: theme.muted,
          "font-size": 12,
          "font-family": "Inter, Microsoft YaHei, PingFang SC, Arial, sans-serif",
          "text-anchor": labelOnLeft ? "end" : "start",
          opacity: 0.88
        })
      );
    })
    .join("");

  const trend =
    points.length >= 3 ? renderTrendLine(points, { minX, maxX, minY, maxY, plot, stroke: theme.accent }) : "";

  const axes =
    textNode(String(minX), { x: plot.x, y: plot.y + plot.height + 24, fill: theme.muted, "font-size": 12, "font-family": "Inter, Arial, sans-serif" }) +
    textNode(String(maxX), { x: plot.x + plot.width, y: plot.y + plot.height + 24, fill: theme.muted, "font-size": 12, "font-family": "Inter, Arial, sans-serif", "text-anchor": "end" }) +
    textNode(String(maxY), { x: plot.x - 10, y: plot.y + 4, fill: theme.muted, "font-size": 12, "font-family": "Inter, Arial, sans-serif", "text-anchor": "end" });

  return gridLines(plot, theme) + trend + circles + axes;
}

function renderTrendLine(
  points: Array<{ x: number; y: number }>,
  options: {
    minX: number;
    maxX: number;
    minY: number;
    maxY: number;
    plot: { x: number; y: number; width: number; height: number };
    stroke: string;
  }
) {
  const { minX, maxX, minY, maxY, plot, stroke } = options;
  const n = points.length;
  const sumX = points.reduce((sum, point) => sum + point.x, 0);
  const sumY = points.reduce((sum, point) => sum + point.y, 0);
  const sumXX = points.reduce((sum, point) => sum + point.x * point.x, 0);
  const sumXY = points.reduce((sum, point) => sum + point.x * point.y, 0);
  const denominator = n * sumXX - sumX * sumX;
  if (Math.abs(denominator) < 0.0001) return "";

  const slope = (n * sumXY - sumX * sumY) / denominator;
  const intercept = (sumY - slope * sumX) / n;
  const y1 = Math.max(minY, Math.min(maxY, slope * minX + intercept));
  const y2 = Math.max(minY, Math.min(maxY, slope * maxX + intercept));
  const xStart = scale(minX, minX, maxX, plot.x, plot.width);
  const xEnd = scale(maxX, minX, maxX, plot.x, plot.width);
  const yStart = plot.y + plot.height - scale(y1, minY, maxY, 0, plot.height);
  const yEnd = plot.y + plot.height - scale(y2, minY, maxY, 0, plot.height);

  return path({
    d: `M ${xStart.toFixed(2)} ${yStart.toFixed(2)} L ${xEnd.toFixed(2)} ${yEnd.toFixed(2)}`,
    fill: "none",
    stroke,
    "stroke-width": 2,
    "stroke-dasharray": "7 8",
    "stroke-linecap": "round",
    opacity: 0.38
  });
}
