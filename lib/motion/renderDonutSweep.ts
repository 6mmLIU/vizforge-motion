import { stagger } from "@/lib/motion/timeline";
import { animate, circle, group, path, textNode } from "@/lib/motion/svgPrimitives";
import { extractAggregatedPoints, polarToCartesian, totalPositive, type Point } from "@/lib/motion/renderUtils";
import { FONT, clamp, colorFor, fitText, formatNumber, round, type Geom, type Rect } from "@/lib/motion/layout";
import type { VisualSpec } from "@/lib/visual/visualSpec";
import type { VisualTheme } from "@/lib/visual/themes";

export function renderDonut(spec: VisualSpec, theme: VisualTheme, g: Geom): string {
  const raw = extractAggregatedPoints(spec, 200);
  const points = raw.some((point) => point.value > 0) ? raw.filter((point) => point.value > 0) : raw;
  const total = totalPositive(points);
  const isPie = spec.type === "pie";

  const vertical = g.tall || g.plot.height > g.plot.width * 0.92;
  const chart: Rect = vertical
    ? { x: g.plot.x, y: g.plot.y, width: g.plot.width, height: g.plot.height * 0.56 }
    : { x: g.plot.x, y: g.plot.y, width: g.plot.width * 0.46, height: g.plot.height };
  const cx = chart.x + chart.width / 2;
  const cy = chart.y + chart.height / 2;
  const radius = Math.min(chart.width, chart.height) / 2 - round(8 * g.s);

  const chartSvg = isPie
    ? renderPie(spec, theme, points, total, cx, cy, radius)
    : renderRing(spec, theme, points, total, cx, cy, radius, g);

  const legend = vertical
    ? renderLegendGrid(theme, points, total, g, { x: g.plot.x, y: chart.y + chart.height + round(18 * g.s), width: g.plot.width, height: g.plot.y + g.plot.height - (chart.y + chart.height) })
    : renderLegendList(theme, points, total, g, { x: g.plot.x + g.plot.width * 0.52, y: g.plot.y, width: g.plot.width * 0.48, height: g.plot.height });

  return group(chartSvg + legend);
}

function renderRing(spec: VisualSpec, theme: VisualTheme, points: Point[], total: number, cx: number, cy: number, radius: number, g: Geom): string {
  const strokeWidth = Math.max(18, radius * 0.34);
  const circumference = 2 * Math.PI * radius;
  let offset = 0;
  const track = circle({ cx, cy, r: round(radius), fill: "none", stroke: theme.track, "stroke-width": round(strokeWidth) });
  const arcs = points
    .map((point, index) => {
      const part = Math.max(0, point.value) / total;
      const dash = part > 0.985 ? circumference : Math.max(0.1, circumference * part - 3);
      const gap = circumference - dash;
      const currentOffset = -offset;
      offset += circumference * part;
      const delay = stagger(index, spec.motion.delayMs, spec.motion.staggerMs);
      return circle(
        {
          cx,
          cy,
          r: round(radius),
          fill: "none",
          stroke: colorFor(theme, index),
          "stroke-width": round(strokeWidth),
          "stroke-linecap": "butt",
          "stroke-dasharray": `${dash.toFixed(2)} ${gap.toFixed(2)}`,
          "stroke-dashoffset": round(currentOffset + dash),
          transform: `rotate(-90 ${cx} ${cy})`
        },
        animate("stroke-dashoffset", round(currentOffset + dash), round(currentOffset), spec.motion.durationMs, delay, spec.motion)
      );
    })
    .join("");

  return (
    track +
    arcs +
    textNode(formatNumber(total), {
      x: cx,
      y: cy + round(6 * g.s),
      fill: theme.strong,
      "font-size": Math.round(clamp(radius * 0.32, 22, 40)),
      "font-family": FONT,
      "font-weight": 740,
      "text-anchor": "middle"
    }) +
    textNode("合计", {
      x: cx,
      y: cy + round(28 * g.s),
      fill: theme.soft,
      "font-size": Math.round(13 * g.s),
      "font-family": FONT,
      "text-anchor": "middle"
    })
  );
}

function renderPie(spec: VisualSpec, theme: VisualTheme, points: Point[], total: number, cx: number, cy: number, radius: number): string {
  let angle = 0;
  return points
    .map((point, index) => {
      const part = Math.max(0, point.value) / total;
      const start = angle;
      const end = angle + part * 360;
      angle = end;
      const delay = stagger(index, spec.motion.delayMs, Math.max(36, spec.motion.staggerMs));
      return path(
        {
          d: pieSlice(cx, cy, radius, start, end),
          fill: colorFor(theme, index),
          stroke: theme.surface,
          "stroke-width": 2,
          opacity: 1
        },
        animate("opacity", 0, 1, 320, delay, { easing: "ease-out" })
      );
    })
    .join("");
}

function renderLegendList(theme: VisualTheme, points: Point[], total: number, g: Geom, box: Rect): string {
  const max = Math.max(3, Math.min(points.length, Math.floor(box.height / round(34 * g.s))));
  const visible = points.slice(0, max);
  const rowGap = Math.min(round(40 * g.s), box.height / Math.max(visible.length, 1));
  const top = box.y + (box.height - rowGap * visible.length) / 2 + rowGap / 2;
  const size = Math.round(14 * g.s);
  const rows = visible
    .map((point, index) => {
      const y = top + index * rowGap;
      const value = Math.max(0, point.value);
      const percent = `${((value / total) * 100).toFixed(value === total ? 0 : 1)}%`;
      return group(
        circle({ cx: box.x, cy: round(y - size * 0.34), r: round(6 * g.s), fill: colorFor(theme, index) }) +
          textNode(fitText(point.label, box.width - round(96 * g.s), size), {
            x: round(box.x + round(16 * g.s)),
            y: round(y),
            fill: theme.text,
            "font-size": size,
            "font-family": FONT,
            "font-weight": 580
          }) +
          textNode(formatNumber(value), {
            x: round(box.x + box.width - round(58 * g.s)),
            y: round(y),
            fill: theme.muted,
            "font-size": Math.round(13 * g.s),
            "font-family": FONT,
            "text-anchor": "end"
          }) +
          textNode(percent, {
            x: round(box.x + box.width),
            y: round(y),
            fill: theme.soft,
            "font-size": Math.round(13 * g.s),
            "font-family": FONT,
            "text-anchor": "end"
          })
      );
    })
    .join("");
  const overflow = points.length - visible.length;
  return rows + (overflow > 0 ? textNode(`其余 ${overflow} 项`, { x: round(box.x + round(16 * g.s)), y: round(top + visible.length * rowGap), fill: theme.soft, "font-size": Math.round(12 * g.s), "font-family": FONT }) : "");
}

function renderLegendGrid(theme: VisualTheme, points: Point[], total: number, g: Geom, box: Rect): string {
  const cols = box.width > 520 ? 3 : 2;
  const max = Math.min(points.length, cols * 3);
  const visible = points.slice(0, max);
  const colWidth = box.width / cols;
  const rowGap = round(40 * g.s);
  const size = Math.round(14 * g.s);
  return visible
    .map((point, index) => {
      const col = index % cols;
      const row = Math.floor(index / cols);
      const x = box.x + col * colWidth;
      const y = box.y + round(8 * g.s) + row * rowGap;
      const value = Math.max(0, point.value);
      const percent = `${((value / total) * 100).toFixed(value === total ? 0 : 1)}%`;
      return group(
        circle({ cx: round(x), cy: round(y - size * 0.34), r: round(6 * g.s), fill: colorFor(theme, index) }) +
          textNode(fitText(point.label, colWidth - round(74 * g.s), size), {
            x: round(x + round(16 * g.s)),
            y: round(y),
            fill: theme.text,
            "font-size": size,
            "font-family": FONT,
            "font-weight": 580
          }) +
          textNode(percent, {
            x: round(x + colWidth - round(18 * g.s)),
            y: round(y),
            fill: theme.soft,
            "font-size": Math.round(13 * g.s),
            "font-family": FONT,
            "font-weight": 560,
            "text-anchor": "end"
          })
      );
    })
    .join("");
}

function pieSlice(cx: number, cy: number, radius: number, startAngle: number, endAngle: number): string {
  const start = polarToCartesian(cx, cy, radius, startAngle);
  const end = polarToCartesian(cx, cy, radius, endAngle);
  const largeArc = endAngle - startAngle > 180 ? 1 : 0;
  return `M ${cx.toFixed(2)} ${cy.toFixed(2)} L ${start.x.toFixed(2)} ${start.y.toFixed(2)} A ${radius.toFixed(2)} ${radius.toFixed(2)} 0 ${largeArc} 1 ${end.x.toFixed(2)} ${end.y.toFixed(2)} Z`;
}
