import { animate, circle, group, line, textNode } from "@/lib/motion/svgPrimitives";
import { extractPoints, polarToCartesian } from "@/lib/motion/renderUtils";
import { stagger } from "@/lib/motion/timeline";
import type { VisualSpec } from "@/lib/visual/visualSpec";
import type { VisualTheme } from "@/lib/visual/themes";

export function renderNetwork(spec: VisualSpec, theme: VisualTheme): string {
  const points = extractPoints(spec, 200);
  const cx = spec.export.width / 2;
  const cy = spec.export.height / 2 + 24;
  const radius = Math.min(spec.export.width, spec.export.height) * 0.31;
  const nodeRadius = points.length > 80 ? 4 : points.length > 40 ? 7 : 13;
  const labelEvery = points.length <= 24 ? 1 : Math.ceil(points.length / 24);
  const edgeOpacity = points.length > 80 ? 0.22 : points.length > 40 ? 0.34 : 0.5;
  const ringOpacity = points.length > 80 ? 0.18 : points.length > 40 ? 0.26 : 0.38;
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
        line({ x1: hub.x, y1: hub.y, x2: Number(node.x.toFixed(2)), y2: Number(node.y.toFixed(2)), stroke: theme.palette[index % theme.palette.length], "stroke-width": points.length > 80 ? 0.7 : 1.4, opacity: edgeOpacity }, animate("opacity", 0, edgeOpacity, spec.motion.durationMs, delay, spec.motion)) +
        line({ x1: Number(node.x.toFixed(2)), y1: Number(node.y.toFixed(2)), x2: Number(next.x.toFixed(2)), y2: Number(next.y.toFixed(2)), stroke: theme.border, "stroke-width": points.length > 80 ? 0.6 : 1, opacity: ringOpacity }, animate("opacity", 0, ringOpacity, spec.motion.durationMs, delay + 120, spec.motion))
      );
    })
    .join("");

  const nodeSvg =
    circle({ cx, cy, r: 28, fill: theme.accent, opacity: 0.2, stroke: theme.palette[0], "stroke-width": 2 }) +
    textNode("hub", { x: cx, y: cy + 5, fill: theme.text, "font-size": 13, "font-family": "Inter, Arial, sans-serif", "font-weight": 760, "text-anchor": "middle" }) +
    nodes
      .map((node, index) => {
        const delay = stagger(index, spec.motion.delayMs, Math.max(8, Math.min(55, 1100 / Math.max(points.length, 1))));
        return group(
          circle({ cx: Number(node.x.toFixed(2)), cy: Number(node.y.toFixed(2)), r: nodeRadius, fill: theme.palette[index % theme.palette.length], opacity: 0.92 }, animate("opacity", 0, 0.92, 420, delay, { easing: "ease-out" })) +
            (index % labelEvery === 0
              ? textNode(node.label.slice(0, 9), { x: Number(node.x.toFixed(2)), y: Number((node.y + nodeRadius + 17).toFixed(2)), fill: theme.muted, "font-size": points.length > 40 ? 9 : 11, "font-family": "Inter, Arial, sans-serif", "text-anchor": "middle" })
              : "")
        );
      })
      .join("");

  return group(edges + nodeSvg);
}
