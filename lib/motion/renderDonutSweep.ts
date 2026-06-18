import { stagger } from "@/lib/motion/timeline";
import { animate, circle, group, textNode } from "@/lib/motion/svgPrimitives";
import { extractAggregatedPoints, totalPositive } from "@/lib/motion/renderUtils";
import type { VisualSpec } from "@/lib/visual/visualSpec";
import type { VisualTheme } from "@/lib/visual/themes";

const DASHBOARD_FONT = "Inter, Microsoft YaHei, PingFang SC, Arial, sans-serif";

function formatNumber(value: number): string {
  return value.toLocaleString("zh-CN", { maximumFractionDigits: value >= 10 ? 0 : 1 });
}

export function renderDonutSweep(spec: VisualSpec, theme: VisualTheme): string {
  const points = extractAggregatedPoints(spec, 200);
  const total = totalPositive(points);
  const dashboard = theme.id === "editorial-light";
  const cx = dashboard ? spec.export.width * 0.38 : spec.export.width / 2;
  const cy = dashboard ? spec.export.height * 0.57 : spec.export.height / 2 + 22;
  const radius = Math.min(spec.export.width, spec.export.height) * (dashboard ? 0.2 : 0.25);
  const strokeWidth = Math.max(dashboard ? 18 : 22, radius * 0.22);
  const circumference = 2 * Math.PI * radius;
  let offset = 0;

  const track = circle({
    cx,
    cy,
    r: Number(radius.toFixed(2)),
    fill: "none",
    stroke: dashboard ? "#edf0f3" : theme.border,
    "stroke-width": Number(strokeWidth.toFixed(2)),
    opacity: dashboard ? 1 : 0.62
  });

  const arcs = points
    .map((point, index) => {
      const part = Math.max(0, point.value) / total;
      const dash = part > 0.985 ? circumference : Math.max(0.1, circumference * part - 4);
      const gap = circumference - dash;
      const currentOffset = -offset;
      offset += circumference * part;
      const delay = stagger(index, spec.motion.delayMs, spec.motion.staggerMs);
      return circle(
        {
          cx,
          cy,
          r: Number(radius.toFixed(2)),
          fill: "none",
          stroke: theme.palette[index % theme.palette.length],
          "stroke-width": Number(strokeWidth.toFixed(2)),
          "stroke-linecap": "round",
          "stroke-dasharray": `${dash.toFixed(2)} ${gap.toFixed(2)}`,
          "stroke-dashoffset": Number((currentOffset + dash).toFixed(2)),
          transform: `rotate(-90 ${cx} ${cy})`
        },
        animate(
          "stroke-dashoffset",
          Number((currentOffset + dash).toFixed(2)),
          Number(currentOffset.toFixed(2)),
          spec.motion.durationMs,
          delay,
          spec.motion
        )
      );
    })
    .join("");

  const legend = points
    .slice(0, dashboard ? Math.min(10, points.length) : Math.min(12, points.length))
    .map((point, index) => {
      const color = theme.palette[index % theme.palette.length];
      const positiveValue = Math.max(0, point.value);
      const percent = `${((positiveValue / total) * 100).toFixed(positiveValue === total ? 0 : 1)}%`;

      if (!dashboard) {
        const itemWidth = 138;
        const x = 70 + index * itemWidth;
        const y = spec.export.height - 82;
        return group(
          circle({ cx: x, cy: y - 4, r: 5, fill: color }) +
            textNode(point.label.slice(0, 14), {
              x: x + 12,
              y,
              fill: theme.muted,
              "font-size": theme.typography.label,
              "font-family": DASHBOARD_FONT
            })
        );
      }

      const x = spec.export.width * 0.62;
      const y = 176 + index * 38;
      return group(
        circle({ cx: x, cy: y - 5, r: 5.5, fill: color }) +
          textNode(point.label.slice(0, 9), {
            x: x + 12,
            y,
            fill: theme.text,
            "font-size": 14,
            "font-family": DASHBOARD_FONT,
            "font-weight": 580
          }) +
          textNode(formatNumber(positiveValue), {
            x: spec.export.width - 106,
            y,
            fill: "#52525b",
            "font-size": 13,
            "font-family": DASHBOARD_FONT,
            "text-anchor": "end"
          }) +
          textNode(percent, {
            x: spec.export.width - 54,
            y,
            fill: "#71717a",
            "font-size": 13,
            "font-family": DASHBOARD_FONT,
            "text-anchor": "end"
          })
      );
    })
    .join("");

  return group(
    track +
      arcs +
      textNode(formatNumber(total), {
        x: cx,
        y: cy + 5,
        fill: theme.text,
        "font-size": dashboard ? 26 : theme.typography.value,
        "font-family": DASHBOARD_FONT,
        "font-weight": 780,
        "text-anchor": "middle"
      }) +
      textNode("合计", {
        x: cx,
        y: cy + 32,
        fill: theme.muted,
        "font-size": dashboard ? 13 : theme.typography.label,
        "font-family": DASHBOARD_FONT,
        "text-anchor": "middle"
      }) +
      legend
  );
}
