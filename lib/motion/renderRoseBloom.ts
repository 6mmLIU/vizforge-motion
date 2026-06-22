import { animate, circle, group, path, textNode } from "@/lib/motion/svgPrimitives";
import { extractAggregatedPoints, maxAbs, polarToCartesian } from "@/lib/motion/renderUtils";
import type { VisualSpec } from "@/lib/visual/visualSpec";
import type { VisualTheme } from "@/lib/visual/themes";

const DASHBOARD_FONT = "Inter, Microsoft YaHei, PingFang SC, Arial, sans-serif";

function formatNumber(value: number): string {
  return value.toLocaleString("zh-CN", { maximumFractionDigits: value >= 10 ? 0 : 1 });
}

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

export function renderRoseBloom(spec: VisualSpec, theme: VisualTheme): string {
  const rawPoints = extractAggregatedPoints(spec, 200);
  const points = rawPoints.some((point) => point.value > 0) ? rawPoints.filter((point) => point.value > 0) : rawPoints;
  const max = maxAbs(points);
  const dashboard = theme.id === "editorial-light";
  const cx = spec.export.width / 2;
  const cy = spec.export.height / 2 + (dashboard ? 22 : 26);
  const inner = dashboard ? 16 : 18;
  const maxRadius = Math.min(spec.export.width, spec.export.height) * (dashboard ? 0.24 : 0.32);
  const angle = 360 / Math.max(points.length, 1);
  const gap = Math.min(dashboard ? 0.6 : 0.8, Math.max(0.25, angle * 0.006));
  const startOffset = -angle / 2;

  const petals = points
    .map((point, index) => {
      const start = startOffset + index * angle + gap;
      const end = startOffset + (index + 1) * angle - gap;
      const outer = inner + Math.sqrt(Math.max(0, point.value) / max) * (maxRadius - inner);
      const collapsed = sectorPath(cx, cy, inner, inner + 1, start, end);
      const expanded = sectorPath(cx, cy, inner, outer, start, end);
      const opacity = dashboard ? 0.92 : 0.78;
      return path(
        {
          d: expanded,
          fill: theme.palette[index % theme.palette.length],
          opacity,
          stroke: dashboard ? "#ffffff" : undefined,
          "stroke-width": dashboard ? 0.8 : undefined,
          "stroke-linejoin": "round"
        },
        animate("d", collapsed, expanded, spec.motion.durationMs, spec.motion.delayMs, spec.motion) +
          animate("opacity", 0, opacity, 480, spec.motion.delayMs, { easing: "ease-out" })
      );
    })
    .join("");

  const labelStep = points.length <= 8 ? 1 : points.length <= 14 ? 2 : Math.ceil(points.length / 7);
  const labelCap = dashboard ? 10 : 14;
  const showValue = dashboard && points.length <= 8;
  const labels = points
    .map((point, index) => ({ point, index }))
    .filter(({ index }) => index % labelStep === 0)
    .slice(0, labelCap)
    .map(({ point, index }) => {
      const angleMid = startOffset + index * angle + angle / 2;
      const elbow = polarToCartesian(cx, cy, maxRadius + (dashboard ? 10 : 18), angleMid);
      const pos = polarToCartesian(cx, cy, maxRadius + (dashboard ? 28 : 28), angleMid);
      const rightSide = pos.x >= cx;
      const labelX = pos.x + (dashboard ? (rightSide ? 16 : -16) : 0);
      const anchor = dashboard ? (rightSide ? "start" : "end") : "middle";
      const minX = dashboard && !rightSide ? 88 : 32;
      const maxX = dashboard && rightSide ? spec.export.width - 88 : spec.export.width - 32;
      const clampedLabelX = Math.max(minX, Math.min(maxX, labelX));
      const leader = dashboard
        ? path({
            d: `M ${elbow.x.toFixed(2)} ${elbow.y.toFixed(2)} L ${pos.x.toFixed(2)} ${pos.y.toFixed(2)} H ${clampedLabelX.toFixed(2)}`,
            fill: "none",
            stroke: theme.palette[index % theme.palette.length],
            "stroke-width": 1.1,
            "stroke-linecap": "round",
            opacity: 0.72
          })
        : "";
      return (
        leader +
        textNode(point.label.slice(0, 8), {
          x: Number(clampedLabelX.toFixed(2)),
          y: Number((pos.y + (points.length <= 8 ? -2 : 4)).toFixed(2)),
          fill: dashboard ? theme.text : theme.muted,
          "font-size": dashboard ? 12 : 12,
          "font-family": DASHBOARD_FONT,
          "font-weight": dashboard ? 560 : undefined,
          "text-anchor": anchor
        }) +
        (showValue
          ? textNode(formatNumber(point.value), {
              x: Number(clampedLabelX.toFixed(2)),
              y: Number((pos.y + 15).toFixed(2)),
              fill: "#71717a",
              "font-size": 11,
              "font-family": DASHBOARD_FONT,
              "text-anchor": anchor
            })
          : "")
      );
    })
    .join("");

  return group(
    petals +
      circle({ cx, cy, r: inner - 1, fill: theme.surface, stroke: dashboard ? "#ffffff" : undefined, "stroke-width": dashboard ? 1.4 : undefined }) +
      labels
  );
}
