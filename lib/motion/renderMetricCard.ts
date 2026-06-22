import { animate, group, rect, textNode } from "@/lib/motion/svgPrimitives";
import { extractPoints, maxAbs, type Point } from "@/lib/motion/renderUtils";
import {
  FONT,
  clamp,
  colorFor,
  estTextWidth,
  fillFor,
  formatMetricValue,
  metricTrend,
  round,
  shortMonth,
  type Geom,
  type Rect
} from "@/lib/motion/layout";
import type { CardMetric, VisualSpec } from "@/lib/visual/visualSpec";
import type { VisualTheme } from "@/lib/visual/themes";

export function renderMetricCard(spec: VisualSpec, theme: VisualTheme, g: Geom): string {
  const points = extractPoints(spec, 200);
  const primaryPoint = points[0] ?? { label: "指标", value: 0, raw: {} };
  const metrics = spec.card?.metrics ?? [];
  const primaryMetric = metrics[0];
  const primaryLabel = primaryMetric?.label ?? primaryPoint.label;
  const primaryValue = primaryMetric
    ? formatMetricValue(primaryMetric.value, primaryMetric.prefix, primaryMetric.suffix)
    : primaryPoint.value.toLocaleString("en-US");
  const trend = primaryMetric ? metricTrend(primaryMetric) : null;
  const secondary = metrics.slice(1, 4);

  const plot = g.plot;
  const labelSize = Math.round(15 * g.s);
  const valueSize = Math.round(clamp(g.w * 0.085, 40, 76));
  const labelY = plot.y + round(20 * g.s);
  const valueY = labelY + valueSize * 0.92;

  const primary =
    textNode(primaryLabel, {
      x: plot.x,
      y: round(labelY),
      fill: theme.muted,
      "font-size": labelSize,
      "font-family": FONT,
      "font-weight": 460
    }) +
    textNode(
      primaryValue,
      {
        x: plot.x,
        y: round(valueY),
        fill: theme.strong,
        opacity: 1,
        "font-size": valueSize,
        "font-family": FONT,
        "font-weight": 760
      },
      animate("opacity", 0, 1, 420, spec.motion.delayMs + 160, { easing: "ease-out" })
    ) +
    (trend
      ? textNode(trend.text, {
          x: round(plot.x + estTextWidth(primaryValue, valueSize) + round(16 * g.s)),
          y: round(valueY - valueSize * 0.1),
          fill: trend.fill,
          "font-size": Math.round(15 * g.s),
          "font-family": FONT,
          "font-weight": 560
        })
      : "");

  let cursorY = valueY + round(24 * g.s);
  const secondaryRow = secondary.length ? renderSecondary(secondary, theme, g, cursorY) : "";
  if (secondary.length) cursorY += round(86 * g.s);

  const panelTop = cursorY + round(8 * g.s);
  const panelHeight = plot.y + plot.height - panelTop;
  const spark = points.length && panelHeight > 70 ? renderSparkPanel(points, spec, theme, g, { x: plot.x, y: panelTop, width: plot.width, height: panelHeight }) : "";

  return group(primary + secondaryRow + spark);
}

function renderSecondary(metrics: CardMetric[], theme: VisualTheme, g: Geom, top: number): string {
  const gap = round(14 * g.s);
  const available = g.plot.width - gap * (metrics.length - 1);
  const itemWidth = available / metrics.length;
  const height = round(72 * g.s);
  return metrics
    .map((metric, index) => {
      const x = g.plot.x + index * (itemWidth + gap);
      const value = formatMetricValue(metric.value, metric.prefix, metric.suffix);
      const trend = metricTrend(metric);
      const padX = round(16 * g.s);
      return (
        rect({ x: round(x), y: round(top), width: round(itemWidth), height, rx: round(16 * g.s), fill: theme.header, stroke: theme.border, "stroke-width": 1 }) +
        textNode(value, {
          x: round(x + padX),
          y: round(top + height * 0.46),
          fill: theme.strong,
          "font-size": Math.round(22 * g.s),
          "font-family": FONT,
          "font-weight": 700
        }) +
        (trend
          ? textNode(trend.text, {
              x: round(x + itemWidth - padX),
              y: round(top + height * 0.42),
              fill: trend.fill,
              "font-size": Math.round(11.5 * g.s),
              "font-family": FONT,
              "font-weight": 540,
              "text-anchor": "end"
            })
          : "") +
        textNode(metric.label, {
          x: round(x + padX),
          y: round(top + height * 0.82),
          fill: theme.muted,
          "font-size": Math.round(12.5 * g.s),
          "font-family": FONT
        })
      );
    })
    .join("");
}

function renderSparkPanel(points: Point[], spec: VisualSpec, theme: VisualTheme, g: Geom, box: Rect): string {
  const headingY = box.y + round(28 * g.s);
  const panel = rect({ x: round(box.x), y: round(box.y), width: round(box.width), height: round(box.height), rx: round(20 * g.s), fill: theme.header, stroke: theme.border, "stroke-width": 1 });
  const accentBar = rect({ x: round(box.x + round(18 * g.s)), y: round(headingY - round(14 * g.s)), width: round(36 * g.s), height: round(4 * g.s), rx: 2, fill: theme.accent });
  const heading = textNode("趋势概览", {
    x: round(box.x + round(18 * g.s) + round(46 * g.s)),
    y: round(headingY),
    fill: theme.text,
    "font-size": Math.round(15 * g.s),
    "font-family": FONT,
    "font-weight": 580
  });

  const plot: Rect = {
    x: box.x + round(26 * g.s),
    y: headingY + round(18 * g.s),
    width: box.width - round(52 * g.s),
    height: box.height - round(72 * g.s)
  };
  const max = maxAbs(points);
  const slot = plot.width / Math.max(points.length, 1);
  const barWidth = clamp(slot * 0.56, points.length > 80 ? 1.5 : 3, 22);
  const baseY = plot.y + plot.height;
  const bars = points
    .map((point, index) => {
      const value = Math.max(0, point.value);
      const barHeight = Math.max(4, (value / max) * plot.height);
      const x = plot.x + index * slot + (slot - barWidth) / 2;
      const y = baseY - barHeight;
      return rect(
        {
          x: round(x),
          y: round(y),
          width: round(barWidth),
          height: round(barHeight),
          rx: round(Math.min(7, barWidth * 0.42)),
          fill: points.length <= 12 ? fillFor(theme, index) : colorFor(theme, 0),
          opacity: points.length > 12 && index !== points.length - 1 ? 0.6 : 0.96
        },
        animate("height", 0, round(barHeight), spec.motion.durationMs, spec.motion.delayMs + index * 36, { easing: "cinematic" }) +
          animate("y", baseY, round(y), spec.motion.durationMs, spec.motion.delayMs + index * 36, { easing: "cinematic" })
      );
    })
    .join("");

  const first = points[0]?.label ? shortMonth(points[0].label) : "";
  const last = points[points.length - 1]?.label ? shortMonth(points[points.length - 1].label) : "";
  const axis =
    rect({ x: round(plot.x), y: round(baseY), width: round(plot.width), height: 1, fill: theme.divider }) +
    (first ? textNode(first, { x: round(plot.x), y: round(baseY + round(22 * g.s)), fill: theme.soft, "font-size": Math.round(12 * g.s), "font-family": FONT }) : "") +
    (last && last !== first ? textNode(last, { x: round(plot.x + plot.width), y: round(baseY + round(22 * g.s)), fill: theme.soft, "font-size": Math.round(12 * g.s), "font-family": FONT, "text-anchor": "end" }) : "");

  return panel + accentBar + heading + axis + bars;
}
