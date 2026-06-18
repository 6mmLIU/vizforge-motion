import { animate, circle, group, path, textNode } from "@/lib/motion/svgPrimitives";
import { extractPoints, gridLines, maxAbs } from "@/lib/motion/renderUtils";
import type { VisualSpec } from "@/lib/visual/visualSpec";
import type { VisualTheme } from "@/lib/visual/themes";

const DASHBOARD_FONT = "Inter, Microsoft YaHei, PingFang SC, Arial, sans-serif";

export function renderLineDraw(spec: VisualSpec, theme: VisualTheme): string {
  const points = extractPoints(spec, 200);
  const dashboard = theme.id === "editorial-light";
  const plot = dashboard
    ? { x: 64, y: 150, width: spec.export.width - 128, height: spec.export.height - 238 }
    : { x: 76, y: 132, width: spec.export.width - 152, height: spec.export.height - 232 };
  const max = maxAbs(points);
  const step = points.length > 1 ? plot.width / (points.length - 1) : 0;
  const coordinates = points.map((point, index) => ({
    x: plot.x + index * step,
    y: plot.y + plot.height - (Math.max(0, point.value) / max) * plot.height,
    point
  }));
  const d = dashboard ? smoothPath(coordinates) : coordinatesToPath(coordinates);
  const areaD =
    coordinates.length > 0
      ? `${d} L ${coordinates[coordinates.length - 1].x.toFixed(2)} ${(plot.y + plot.height).toFixed(2)} L ${coordinates[0].x.toFixed(2)} ${(plot.y + plot.height).toFixed(2)} Z`
      : "";
  const strokeColor = dashboard ? theme.accent : "url(#vizforgeBar)";

  const areaPath =
    dashboard && areaD
      ? path(
          {
            d: areaD,
            fill: theme.accent,
            opacity: 0
          },
          animate("opacity", 0, 0.14, 520, spec.motion.delayMs + 120, { easing: "ease-out" })
        )
      : "";

  const linePath = path(
    {
      d,
      fill: "none",
      stroke: strokeColor,
      "stroke-width": dashboard ? 2.4 : 5,
      "stroke-linecap": "round",
      "stroke-linejoin": "round",
      pathLength: 1,
      "stroke-dasharray": 1,
      "stroke-dashoffset": 1
    },
    animate("stroke-dashoffset", 1, 0, spec.motion.durationMs, spec.motion.delayMs, spec.motion)
  );

  const pointsSvg = coordinates
    .filter((_, index) => points.length <= 24 || index % Math.ceil(points.length / 24) === 0)
    .map((coord, index, visibleCoords) =>
      circle(
        {
          cx: Number(coord.x.toFixed(2)),
          cy: Number(coord.y.toFixed(2)),
          r: dashboard ? 3.2 : 5,
          fill: theme.background,
          stroke: dashboard ? theme.accent : theme.palette[index % theme.palette.length],
          "stroke-width": dashboard ? 2 : 3,
          opacity: 0
        },
        animate(
          "opacity",
          0,
          1,
          240,
          spec.motion.delayMs + Math.round((spec.motion.durationMs * index) / Math.max(visibleCoords.length - 1, 1)) + 80,
          { easing: "ease-out" }
        )
      )
    )
    .join("");

  const labels =
    coordinates.length > 0
      ? textNode(coordinates[0].point.label.slice(0, 12), {
          x: plot.x,
          y: plot.y + plot.height + 26,
          fill: theme.muted,
          "font-size": theme.typography.label,
          "font-family": DASHBOARD_FONT
        }) +
        textNode(coordinates[coordinates.length - 1].point.label.slice(0, 12), {
          x: plot.x + plot.width,
          y: plot.y + plot.height + 26,
          fill: theme.muted,
          "font-size": theme.typography.label,
          "font-family": DASHBOARD_FONT,
          "text-anchor": "end"
        })
      : "";

  return gridLines(plot, theme) + group(areaPath + linePath + pointsSvg + labels);
}

function coordinatesToPath(coordinates: Array<{ x: number; y: number }>): string {
  return coordinates
    .map((coord, index) => `${index === 0 ? "M" : "L"} ${coord.x.toFixed(2)} ${coord.y.toFixed(2)}`)
    .join(" ");
}

function smoothPath(coordinates: Array<{ x: number; y: number }>): string {
  if (coordinates.length <= 2) return coordinatesToPath(coordinates);

  return coordinates
    .map((point, index) => {
      if (index === 0) return `M ${point.x.toFixed(2)} ${point.y.toFixed(2)}`;

      const previous = coordinates[index - 1];
      const previousPrevious = coordinates[index - 2] ?? previous;
      const next = coordinates[index + 1] ?? point;
      const tension = 0.18;
      const cp1x = previous.x + (point.x - previousPrevious.x) * tension;
      const cp1y = previous.y + (point.y - previousPrevious.y) * tension;
      const cp2x = point.x - (next.x - previous.x) * tension;
      const cp2y = point.y - (next.y - previous.y) * tension;
      return `C ${cp1x.toFixed(2)} ${cp1y.toFixed(2)} ${cp2x.toFixed(2)} ${cp2y.toFixed(2)} ${point.x.toFixed(2)} ${point.y.toFixed(2)}`;
    })
    .join(" ");
}
