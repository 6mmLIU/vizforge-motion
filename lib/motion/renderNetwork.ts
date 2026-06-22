import { animate, circle, group, line, textNode } from "@/lib/motion/svgPrimitives";
import { extractPoints, polarToCartesian } from "@/lib/motion/renderUtils";
import { stagger } from "@/lib/motion/timeline";
import type { VisualSpec } from "@/lib/visual/visualSpec";
import type { VisualTheme } from "@/lib/visual/themes";

export function renderNetwork(spec: VisualSpec, theme: VisualTheme): string {
  const points = extractPoints(spec, 200);
  const tall = theme.id === "editorial-light" && spec.export.height / spec.export.width > 1.15;
  const cx = spec.export.width / 2;
  const cy = spec.export.height / 2 + (tall ? 42 : 24);
  const radius = Math.min(spec.export.width, spec.export.height) * (tall ? 0.34 : 0.31);
  const nodeRadius = points.length > 80 ? (tall ? 5 : 4) : points.length > 40 ? (tall ? 8 : 7) : tall ? 16 : 13;
  const labelEvery = points.length <= 24 ? 1 : Math.ceil(points.length / 24);
  const edgeOpacity = points.length > 80 ? 0.24 : points.length > 40 ? 0.38 : tall ? 0.58 : 0.5;
  const ringOpacity = points.length > 80 ? 0.18 : points.length > 40 ? 0.28 : tall ? 0.46 : 0.38;
  const nodes = points.map((point, index) => {
    const angle = (360 / Math.max(points.length, 1)) * index;
    const pos = polarToCartesian(cx, cy, radius, angle);
    return { ...point, x: pos.x, y: pos.y };
  });

  const edges = nodes
    .map((node, index) => {
      const next = nodes[(index + 1) % nodes.length];
      const hub = { x: cx, y: cy };
      const delay = stagger(index, spec.motion.delayMs, Math.max(8, Math.min(40, 900 / Math.max(points.length, 1))));
      return (
        line({ x1: hub.x, y1: hub.y, x2: Number(node.x.toFixed(2)), y2: Number(node.y.toFixed(2)), stroke: theme.palette[index % theme.palette.length], "stroke-width": points.length > 80 ? 0.7 : tall ? 1.8 : 1.4, opacity: edgeOpacity }, animate("opacity", 0, edgeOpacity, spec.motion.durationMs, delay, spec.motion)) +
        line({ x1: Number(node.x.toFixed(2)), y1: Number(node.y.toFixed(2)), x2: Number(next.x.toFixed(2)), y2: Number(next.y.toFixed(2)), stroke: theme.border, "stroke-width": points.length > 80 ? 0.6 : 1, opacity: ringOpacity }, animate("opacity", 0, ringOpacity, spec.motion.durationMs, delay + 120, spec.motion))
      );
    })
    .join("");

  const nodeSvg =
    circle({ cx, cy, r: tall ? 36 : 28, fill: theme.accent, opacity: 0.22, stroke: theme.palette[0], "stroke-width": tall ? 2.4 : 2 }) +
    textNode("hub", { x: cx, y: cy + 5, fill: theme.text, "font-size": tall ? 15 : 13, "font-family": "Noto Sans CJK SC, PingFang SC, Microsoft YaHei, Arial, sans-serif", "font-weight": 760, "text-anchor": "middle" }) +
    nodes
      .map((node, index) => {
        const delay = stagger(index, spec.motion.delayMs, Math.max(8, Math.min(55, 1100 / Math.max(points.length, 1))));
        return group(
          circle({
            cx: Number(node.x.toFixed(2)),
            cy: Number(node.y.toFixed(2)),
            r: nodeRadius,
            fill: theme.palette[index % theme.palette.length],
            opacity: 0.94,
            stroke: tall ? theme.surface : undefined,
            "stroke-width": tall ? 2 : undefined
          }, animate("opacity", 0, 0.94, 420, delay, { easing: "ease-out" })) +
            (index % labelEvery === 0
              ? textNode(node.label.slice(0, 9), {
                  x: Number(node.x.toFixed(2)),
                  y: Number((node.y + nodeRadius + (tall ? 22 : 17)).toFixed(2)),
                  fill: tall ? theme.text : theme.muted,
                  "font-size": points.length > 40 ? (tall ? 10 : 9) : tall ? 12 : 11,
                  "font-family": "Noto Sans CJK SC, PingFang SC, Microsoft YaHei, Arial, sans-serif",
                  "font-weight": tall ? 560 : undefined,
                  "text-anchor": "middle"
                })
              : "")
        );
      })
      .join("");

  return group(edges + nodeSvg);
}
