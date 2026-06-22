import { animate, group, rect, textNode } from "@/lib/motion/svgPrimitives";
import { extractAggregatedPoints, totalPositive } from "@/lib/motion/renderUtils";
import { stagger } from "@/lib/motion/timeline";
import type { VisualSpec } from "@/lib/visual/visualSpec";
import type { VisualTheme } from "@/lib/visual/themes";

export function renderTreemap(spec: VisualSpec, theme: VisualTheme): string {
  const points = extractAggregatedPoints(spec, 200).map((point) => ({ ...point, value: Math.max(0, point.value) }));
  const total = totalPositive(points);
  const plot = { x: 76, y: 132, width: spec.export.width - 152, height: spec.export.height - 232 };
  let cursorX = plot.x;
  let cursorY = plot.y;
  let rowHeight = plot.height * 0.46;
  let rowWidth = 0;

  const tiles = points
    .map((point, index) => {
      const areaWidth = Math.max(38, (point.value / total) * plot.width * 1.72);
      if (cursorX + areaWidth > plot.x + plot.width && index > 0) {
        cursorX = plot.x;
        cursorY += rowHeight + 10;
        rowHeight = Math.max(58, plot.y + plot.height - cursorY);
      }
      const width = Math.min(areaWidth, plot.x + plot.width - cursorX);
      const height = rowHeight;
      const x = cursorX;
      const y = cursorY;
      cursorX += width + 10;
      rowWidth += width;
      const delay = stagger(index, spec.motion.delayMs, 55);
      return group(
        rect(
          {
            x,
            y,
            width: Number(width.toFixed(2)),
            height: Number(height.toFixed(2)),
            rx: 12,
            fill: theme.palette[index % theme.palette.length],
            opacity: 0.82
          },
          animate("width", 0, Number(width.toFixed(2)), spec.motion.durationMs, delay, spec.motion)
        ) +
          textNode(point.label.slice(0, 16), {
            x: x + 14,
            y: y + 26,
            fill: theme.background,
            "font-size": 13,
            "font-family": "Inter, Arial, sans-serif",
            "font-weight": 760
          })
      );
    })
    .join("");

  void rowWidth;
  return group(tiles);
}
