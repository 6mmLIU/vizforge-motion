import { animate, circle, group, path, textNode } from "@/lib/motion/svgPrimitives";
import { extractAggregatedPoints, maxAbs, polarToCartesian } from "@/lib/motion/renderUtils";
import { FONT, clamp, colorFor, formatNumber, round, type Geom } from "@/lib/motion/layout";
import type { VisualSpec } from "@/lib/visual/visualSpec";
import type { VisualTheme } from "@/lib/visual/themes";

function sectorPath(cx: number, cy: number, inner: number, outer: number, start: number, end: number): string {
  const startInner = polarToCartesian(cx, cy, inner, start);
  const startOuter = polarToCartesian(cx, cy, outer, start);
  const endOuter = polarToCartesian(cx, cy, outer, end);
  const endInner = polarToCartesian(cx, cy, inner, end);
  const largeArc = Math.abs(end - start) > 180 ? 1 : 0;
  return [
    `M ${startInner.x.toFixed(2)} ${startInner.y.toFixed(2)}`,
    `L ${startOuter.x.toFixed(2)} ${startOuter.y.toFixed(2)}`,
    `A ${outer.toFixed(2)} ${outer.toFixed(2)} 0 ${largeArc} 1 ${endOuter.x.toFixed(2)} ${endOuter.y.toFixed(2)}`,
    `L ${endInner.x.toFixed(2)} ${endInner.y.toFixed(2)}`,
    `A ${inner.toFixed(2)} ${inner.toFixed(2)} 0 ${largeArc} 0 ${startInner.x.toFixed(2)} ${startInner.y.toFixed(2)}`,
    "Z"
  ].join(" ");
}

export function renderRose(spec: VisualSpec, theme: VisualTheme, g: Geom): string {
  const raw = extractAggregatedPoints(spec, 200);
  const points = raw.some((point) => point.value > 0) ? raw.filter((point) => point.value > 0) : raw;
  const max = maxAbs(points);
  const cx = g.plot.x + g.plot.width / 2;
  const cy = g.plot.y + g.plot.height * 0.46;
  const maxRadius = Math.min(g.plot.width, g.plot.height) * 0.4;
  const inner = round(clamp(maxRadius * 0.12, 14, 26));
  const angle = 360 / Math.max(points.length, 1);
  const gap = clamp(angle * 0.04, 0.4, 1.4);

  const petals = points
    .map((point, index) => {
      const start = index * angle + gap;
      const end = (index + 1) * angle - gap;
      const outer = inner + Math.sqrt(Math.max(0, point.value) / max) * (maxRadius - inner);
      const collapsed = sectorPath(cx, cy, inner, inner + 1, start, end);
      const expanded = sectorPath(cx, cy, inner, outer, start, end);
      return path(
        {
          d: expanded,
          fill: colorFor(theme, index),
          opacity: 0.92,
          stroke: theme.surface,
          "stroke-width": 1,
          "stroke-linejoin": "round"
        },
        animate("d", collapsed, expanded, spec.motion.durationMs, spec.motion.delayMs, spec.motion) +
          animate("opacity", 0, 0.92, 480, spec.motion.delayMs, { easing: "ease-out" })
      );
    })
    .join("");

  const labelStep = points.length <= 10 ? 1 : points.length <= 18 ? 2 : Math.ceil(points.length / 9);
  const size = Math.round(12.5 * g.s);
  const labels = points
    .map((point, index) => ({ point, index }))
    .filter(({ index }) => index % labelStep === 0)
    .slice(0, 12)
    .map(({ point, index }) => {
      const mid = index * angle + angle / 2;
      const anchorPos = polarToCartesian(cx, cy, maxRadius + round(20 * g.s), mid);
      const rightSide = anchorPos.x >= cx;
      const labelX = clamp(anchorPos.x, g.plot.x + 6, g.plot.x + g.plot.width - 6);
      const elbow = polarToCartesian(cx, cy, maxRadius + round(8 * g.s), mid);
      return (
        path({
          d: `M ${elbow.x.toFixed(2)} ${elbow.y.toFixed(2)} L ${anchorPos.x.toFixed(2)} ${anchorPos.y.toFixed(2)}`,
          fill: "none",
          stroke: colorFor(theme, index),
          "stroke-width": 1.1,
          opacity: 0.6
        }) +
        textNode(point.label.slice(0, 8), {
          x: round(labelX),
          y: round(anchorPos.y),
          fill: theme.text,
          "font-size": size,
          "font-family": FONT,
          "font-weight": 560,
          "text-anchor": rightSide ? "start" : "end"
        }) +
        textNode(formatNumber(point.value), {
          x: round(labelX),
          y: round(anchorPos.y + size + 2),
          fill: theme.soft,
          "font-size": Math.round(11 * g.s),
          "font-family": FONT,
          "text-anchor": rightSide ? "start" : "end"
        })
      );
    })
    .join("");

  return group(petals + circle({ cx, cy, r: inner - 1, fill: theme.surface }) + labels);
}
