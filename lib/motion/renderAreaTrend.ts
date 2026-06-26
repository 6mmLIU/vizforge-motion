import { animate, circle, group, line, path } from "@/lib/motion/svgPrimitives";
import { maxAbs } from "@/lib/motion/renderUtils";
import { buildSeries, smoothPath, tickIndexes } from "@/lib/motion/series";
import {
  axisLabel,
  clamp,
  legendRow,
  niceTicks,
  round,
  shortMonth,
  yAxisGrid,
  type Geom,
  type Rect
} from "@/lib/motion/layout";
import type { VisualSpec } from "@/lib/visual/visualSpec";
import type { VisualTheme } from "@/lib/visual/themes";

export function renderArea(spec: VisualSpec, theme: VisualTheme, g: Geom): string {
  const bundle = buildSeries(spec, theme);
  const labels = bundle.labels;
  const allValues = bundle.series.flatMap((item) => item.points.map((point) => Math.max(0, point.value)));
  const max = maxAbs(allValues.map((value) => ({ label: "", value, raw: {} })));
  const { ticks, max: tickMax } = niceTicks(max);
  const isFlat = allValues.length > 0 && allValues.every((value) => value === allValues[0]);

  const topReserve = bundle.multi ? round(28 * g.s) : 0;
  const leftAxis = round(clamp(40 * g.s, 32, 54));
  const labelBand = round(34 * g.s);
  const plot: Rect = {
    x: g.plot.x + leftAxis,
    y: g.plot.y + 10 + topReserve,
    width: g.plot.width - leftAxis,
    height: g.plot.height - labelBand - 10 - topReserve
  };
  const baseY = plot.y + plot.height;
  const grid = yAxisGrid(plot, theme, ticks, tickMax, g);
  const baseline = line({ x1: plot.x, x2: plot.x + plot.width, y1: round(baseY), y2: round(baseY), stroke: theme.axis, "stroke-width": 1.2 });
  const legend = bundle.multi
    ? legendRow(bundle.series.map((item) => ({ label: item.name, color: item.color })), theme, g, g.plot.y + round(16 * g.s))
    : "";

  const step = labels.length > 1 ? plot.width / (labels.length - 1) : 0;
  const seriesSvg = bundle.series
    .map((item, seriesIndex) => {
      const coordinates = item.points.map((point, index) => ({
        x: plot.x + index * step,
        y: isFlat ? plot.y + plot.height * 0.5 : plot.y + plot.height - (Math.max(0, point.value) / tickMax) * plot.height
      }));
      if (!coordinates.length) return "";
      const lineD = smoothPath(coordinates);
      const areaD = `${lineD} L ${coordinates[coordinates.length - 1].x.toFixed(2)} ${baseY.toFixed(2)} L ${coordinates[0].x.toFixed(2)} ${baseY.toFixed(2)} Z`;
      const delay = spec.motion.delayMs + seriesIndex * 150;
      const fillOpacity = bundle.multi ? 0.16 : 0.2;

      const dots = coordinates
        .filter((_, index) => coordinates.length <= 16 || index === coordinates.length - 1)
        .map((coord, index, visible) => {
          const dotDelay = delay + Math.round((spec.motion.durationMs * index) / Math.max(visible.length - 1, 1)) + 100;
          return circle(
            {
              cx: round(coord.x),
              cy: round(coord.y),
              r: bundle.multi ? 2.8 : 3.2,
              fill: theme.surface,
              stroke: item.color,
              "stroke-width": 2,
              opacity: 1
            },
            animate("opacity", 0, 1, 220, dotDelay, { easing: "ease-out" })
          );
        })
        .join("");

      return (
        path(
          { d: areaD, fill: item.color, opacity: fillOpacity },
          animate("opacity", 0, fillOpacity, 520, delay + 150, { easing: "ease-out" })
        ) +
        path(
          {
            d: lineD,
            fill: "none",
            stroke: item.color,
            "stroke-width": bundle.multi ? 2.2 : 2.8,
            "stroke-linecap": "round",
            "stroke-linejoin": "round",
            pathLength: 1,
            "stroke-dasharray": 1,
            "stroke-dashoffset": 0
          },
          animate("stroke-dashoffset", 1, 0, spec.motion.durationMs, delay, spec.motion)
        ) +
        dots
      );
    })
    .join("");

  return legend + grid + baseline + group(seriesSvg) + renderXLabels(labels, plot, theme, g);
}

function renderXLabels(labels: string[], plot: Rect, theme: VisualTheme, g: Geom): string {
  if (!labels.length) return "";
  const step = labels.length > 1 ? plot.width / (labels.length - 1) : 0;
  const y = plot.y + plot.height + round(26 * g.s);
  return tickIndexes(labels.length)
    .map((index) => {
      const anchor = index === 0 ? "start" : index === labels.length - 1 ? "end" : "middle";
      return axisLabel(shortMonth(labels[index]), plot.x + step * index, y, theme, g, anchor);
    })
    .join("");
}
