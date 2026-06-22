import { animate, group, rect, textNode } from "@/lib/motion/svgPrimitives";
import { extractPoints, maxAbs, type Point } from "@/lib/motion/renderUtils";
import { stagger } from "@/lib/motion/timeline";
import {
  FONT,
  clamp,
  estTextWidth,
  fillFor,
  fitText,
  formatNumber,
  round,
  type Geom
} from "@/lib/motion/layout";
import type { VisualSpec } from "@/lib/visual/visualSpec";
import type { VisualTheme } from "@/lib/visual/themes";

export function renderHorizontalBar(spec: VisualSpec, theme: VisualTheme, g: Geom): string {
  const points = orderPoints(extractPoints(spec, 200), spec.story !== "magnitude");
  const max = maxAbs(points);
  const plot = g.plot;
  const count = Math.max(1, points.length);
  const step = Math.min(g.tall ? 76 : 56, plot.height / count);
  const barHeight = clamp(step * 0.46, count > 80 ? 2 : 6, g.tall ? 26 : 20);
  const labelSize = Math.round(clamp(step * 0.34, 10, g.tall ? 17 : 15));
  const valueSize = Math.round(clamp(labelSize, 10, 15));
  const labelWidth = clamp(longestLabel(points, labelSize) + 10, 80, plot.width * 0.32);
  const valueWidth = clamp(longestValue(points, valueSize) + 12, 48, plot.width * 0.2);
  const barX = plot.x + labelWidth + round(16 * g.s);
  const barWidth = Math.max(80, plot.width - labelWidth - valueWidth - round(28 * g.s));
  const top = plot.y + Math.max(0, (plot.height - step * count) / 2);

  return points
    .map((point, index) => {
      const rowTop = top + index * step;
      const centerY = rowTop + step / 2;
      const barY = centerY - barHeight / 2;
      const targetWidth = Math.max(3, (Math.max(0, point.value) / max) * barWidth);
      const delay = stagger(index, spec.motion.delayMs, Math.max(34, Math.min(80, spec.motion.staggerMs)));
      const showLabel = step >= 13 || index === 0 || index === points.length - 1;
      return group(
        (showLabel
          ? textNode(fitText(point.label, labelWidth, labelSize), {
              x: round(plot.x),
              y: round(centerY + labelSize * 0.35),
              fill: theme.text,
              "font-size": labelSize,
              "font-family": FONT,
              "font-weight": 600
            })
          : "") +
          rect({
            x: round(barX),
            y: round(barY),
            width: round(barWidth),
            height: round(barHeight),
            rx: round(barHeight / 2),
            fill: theme.track
          }) +
          rect(
            {
              x: round(barX),
              y: round(barY),
              width: round(targetWidth),
              height: round(barHeight),
              rx: round(barHeight / 2),
              fill: fillFor(theme, index)
            },
            animate("width", 0, round(targetWidth), spec.motion.durationMs, delay, spec.motion)
          ) +
          (step >= 13
            ? textNode(
                formatNumber(point.value),
                {
                  x: round(barX + barWidth + round(12 * g.s)),
                  y: round(centerY + valueSize * 0.35),
                  fill: theme.strong,
                  opacity: 1,
                  "font-size": valueSize,
                  "font-family": FONT,
                  "font-weight": 700
                },
                animate("opacity", 0, 1, 300, delay + spec.motion.durationMs - 130, { easing: "ease-out" })
              )
            : "")
      );
    })
    .join("");
}

function orderPoints(points: Point[], ranking: boolean): Point[] {
  if (!ranking) return points;
  return [...points].sort((a, b) => b.value - a.value);
}

function longestLabel(points: Point[], fontSize: number): number {
  return points.reduce((max, point) => Math.max(max, estTextWidth(point.label, fontSize)), 0);
}

function longestValue(points: Point[], fontSize: number): number {
  return points.reduce((max, point) => Math.max(max, estTextWidth(formatNumber(point.value), fontSize)), 0);
}
