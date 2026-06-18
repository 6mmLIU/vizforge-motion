import { coerceNumber } from "@/lib/data/inferSchema";
import { animate, animateTransform, circle, group, textNode } from "@/lib/motion/svgPrimitives";
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

  const circles = points
    .map((point, index) => {
      const x = scale(point.x, minX, maxX, plot.x, plot.width);
      const y = plot.y + plot.height - scale(point.y, minY, maxY, 0, plot.height);
      const radius = spec.type === "bubble" ? 5 + (Math.abs(point.size) / maxSize) * 20 : 6;
      const delay = stagger(index, spec.motion.delayMs, Math.max(18, spec.motion.staggerMs * 0.3));
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
          }) + animateTransform("scale", 0, 1, spec.motion.durationMs, delay, spec.motion),
          { transform: "scale(0)" }
        ),
        { transform: `translate(${x.toFixed(2)} ${y.toFixed(2)})` }
      );
    })
    .join("");

  const axes =
    textNode(String(minX), { x: plot.x, y: plot.y + plot.height + 24, fill: theme.muted, "font-size": 12, "font-family": "Inter, Arial, sans-serif" }) +
    textNode(String(maxX), { x: plot.x + plot.width, y: plot.y + plot.height + 24, fill: theme.muted, "font-size": 12, "font-family": "Inter, Arial, sans-serif", "text-anchor": "end" }) +
    textNode(String(maxY), { x: plot.x - 10, y: plot.y + 4, fill: theme.muted, "font-size": 12, "font-family": "Inter, Arial, sans-serif", "text-anchor": "end" });

  return gridLines(plot, theme) + circles + axes;
}
