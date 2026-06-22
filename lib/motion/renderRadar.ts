import { animate, group, line, polygon, textNode } from "@/lib/motion/svgPrimitives";
import { extractPoints, maxAbs, polarToCartesian } from "@/lib/motion/renderUtils";
import type { VisualSpec } from "@/lib/visual/visualSpec";
import type { VisualTheme } from "@/lib/visual/themes";

export function renderRadar(spec: VisualSpec, theme: VisualTheme): string {
  const sourcePoints = extractPoints(spec, 200);
  const points =
    sourcePoints.length >= 3
      ? sourcePoints
      : [
          ...sourcePoints,
          { label: "Quality", value: 60, raw: {} },
          { label: "Speed", value: 48, raw: {} },
          { label: "Polish", value: 72, raw: {} }
        ].slice(0, 3);
  const max = maxAbs(points);
  const cx = spec.export.width / 2;
  const cy = spec.export.height / 2 + 28;
  const radius = Math.min(spec.export.width, spec.export.height) * 0.3;
  const count = Math.max(points.length, 3);

  const rings = [0.25, 0.5, 0.75, 1]
    .map((ratio) => {
      const ringPoints = Array.from({ length: count }, (_, index) => {
        const angle = (360 / count) * index;
        const point = polarToCartesian(cx, cy, radius * ratio, angle);
        return `${point.x.toFixed(2)},${point.y.toFixed(2)}`;
      }).join(" ");
      return polygon({ points: ringPoints, fill: "none", stroke: theme.text, "stroke-width": 1, opacity: theme.gridOpacity });
    })
    .join("");

  const axes = points
    .map((point, index) => {
      const angle = (360 / count) * index;
      const end = polarToCartesian(cx, cy, radius, angle);
      const label = polarToCartesian(cx, cy, radius + 28, angle);
      return (
        line({ x1: cx, y1: cy, x2: Number(end.x.toFixed(2)), y2: Number(end.y.toFixed(2)), stroke: theme.text, "stroke-width": 1, opacity: theme.axisOpacity }) +
        (points.length <= 24 || index % Math.ceil(points.length / 24) === 0
          ? textNode(point.label.slice(0, 10), { x: Number(label.x.toFixed(2)), y: Number(label.y.toFixed(2)), fill: theme.muted, "font-size": 12, "font-family": "Inter, Arial, sans-serif", "text-anchor": "middle" })
          : "")
      );
    })
    .join("");

  const finalPoints = points
    .map((point, index) => {
      const angle = (360 / count) * index;
      const pos = polarToCartesian(cx, cy, radius * (Math.max(0, point.value) / max), angle);
      return `${pos.x.toFixed(2)},${pos.y.toFixed(2)}`;
    })
    .join(" ");
  const collapsed = points.map(() => `${cx.toFixed(2)},${cy.toFixed(2)}`).join(" ");

  return group(
    rings +
      axes +
      polygon(
        { points: finalPoints, fill: theme.accent, opacity: 0.24, stroke: theme.palette[0], "stroke-width": 4 },
        animate("points", collapsed, finalPoints, spec.motion.durationMs, spec.motion.delayMs, spec.motion)
      )
  );
}
