import { animate, circle, group, line, path, rect, textNode } from "@/lib/motion/svgPrimitives";
import { extractPoints, gridLines, maxAbs } from "@/lib/motion/renderUtils";
import type { VisualSpec } from "@/lib/visual/visualSpec";
import type { VisualTheme } from "@/lib/visual/themes";

const DASHBOARD_FONT = "Inter, Microsoft YaHei, PingFang SC, Arial, sans-serif";

export function renderLineDraw(spec: VisualSpec, theme: VisualTheme): string {
  if (theme.id === "editorial-light") {
    if (spec.type === "line-race") return renderMultiLineRace(spec, theme);
    if (spec.type === "slope") return renderSlopeChart(spec, theme);
    if (spec.type === "bump") return renderBumpChart(spec, theme);
    if (spec.type === "timeline") return renderTimelineChart(spec, theme);
  }

  const points = extractPoints(spec, 200);
  const dashboard = theme.id === "editorial-light";
  const tall = dashboard && spec.export.height / spec.export.width > 1.15;
  const plot = dashboard
    ? { x: 64, y: tall ? 190 : 150, width: spec.export.width - 128, height: spec.export.height - (tall ? 318 : 238) }
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
            opacity: 0.14
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
      "stroke-dashoffset": 0
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
          opacity: 1
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

function renderMultiLineRace(spec: VisualSpec, theme: VisualTheme): string {
  const points = extractPoints(spec, 80);
  const plot = dashboardPlot(spec);
  const max = maxAbs(points) * 1.18;
  const series = [
    { label: "领先", factor: (index: number) => 1 + Math.sin(index / 2) * 0.08 },
    { label: "追赶", factor: (index: number) => 0.78 + Math.cos(index / 3) * 0.1 },
    { label: "基准", factor: (index: number) => 0.58 + Math.sin(index / 4 + 1.2) * 0.09 }
  ];
  const step = points.length > 1 ? plot.width / (points.length - 1) : 0;

  const lines = series
    .map((item, seriesIndex) => {
      const coordinates = points.map((point, index) => {
        const value = Math.max(0, point.value * item.factor(index));
        return {
          x: plot.x + index * step,
          y: plot.y + plot.height - (value / max) * plot.height
        };
      });
      const d = smoothPath(coordinates);
      const last = coordinates[coordinates.length - 1];
      const color = theme.palette[seriesIndex % theme.palette.length];
      return (
        path({
          d,
          fill: "none",
          stroke: color,
          "stroke-width": 2.5,
          "stroke-linecap": "round",
          "stroke-linejoin": "round",
          pathLength: 1,
          "stroke-dasharray": 1,
          "stroke-dashoffset": 0
        }) +
        (last
          ? textNode(item.label, {
              x: Number((last.x + 12).toFixed(2)),
              y: Number((last.y + 5).toFixed(2)),
              fill: color,
              "font-size": 13,
              "font-family": DASHBOARD_FONT,
              "font-weight": 660
            })
          : "")
      );
    })
    .join("");

  return gridLines(plot, theme) + group(lines + renderEndpointLabels(points, plot, theme));
}

function renderSlopeChart(spec: VisualSpec, theme: VisualTheme): string {
  const points = extractPoints(spec, 12);
  const tall = spec.export.height / spec.export.width > 1.15;
  const half = Math.max(1, Math.floor(points.length / 2));
  const pairs = points.slice(0, half).map((point, index) => ({
    label: point.label,
    start: point.value,
    end: points[index + half]?.value ?? point.value
  }));
  const values = pairs.flatMap((pair) => [pair.start, pair.end]);
  const max = Math.max(...values, 1);
  const plot = { x: 104, y: tall ? 190 : 146, width: spec.export.width - 208, height: spec.export.height - (tall ? 320 : 240) };
  const leftX = plot.x + 30;
  const rightX = plot.x + plot.width - 30;
  const yFor = (value: number) => plot.y + plot.height - (Math.max(0, value) / max) * plot.height;

  const slopes = pairs
    .slice(0, 7)
    .map((pair, index) => {
      const y1 = yFor(pair.start);
      const y2 = yFor(pair.end);
      const positive = pair.end >= pair.start;
      const color = positive ? theme.palette[index % theme.palette.length] : "#f97316";
      return group(
        path({ d: `M ${leftX} ${y1.toFixed(2)} L ${rightX} ${y2.toFixed(2)}`, fill: "none", stroke: color, "stroke-width": 2.4, "stroke-linecap": "round" }) +
          circle({ cx: leftX, cy: Number(y1.toFixed(2)), r: 4.5, fill: theme.surface, stroke: color, "stroke-width": 2 }) +
          circle({ cx: rightX, cy: Number(y2.toFixed(2)), r: 4.5, fill: color }) +
          textNode(pair.label.slice(0, 8), {
            x: leftX - 12,
            y: Number((y1 + 5).toFixed(2)),
            fill: theme.text,
            "font-size": 13,
            "font-family": DASHBOARD_FONT,
            "text-anchor": "end"
          }) +
          textNode(formatNumber(pair.end), {
            x: rightX + 12,
            y: Number((y2 + 5).toFixed(2)),
            fill: theme.text,
            "font-size": 13,
            "font-family": DASHBOARD_FONT,
            "font-weight": 650
          })
      );
    })
    .join("");

  return (
    line({ x1: leftX, x2: leftX, y1: plot.y, y2: plot.y + plot.height, stroke: "#e5e7eb", "stroke-width": 1 }) +
    line({ x1: rightX, x2: rightX, y1: plot.y, y2: plot.y + plot.height, stroke: "#e5e7eb", "stroke-width": 1 }) +
    textNode("起点", { x: leftX, y: plot.y - 18, fill: "#52525b", "font-size": 14, "font-family": DASHBOARD_FONT, "text-anchor": "middle" }) +
    textNode("终点", { x: rightX, y: plot.y - 18, fill: "#52525b", "font-size": 14, "font-family": DASHBOARD_FONT, "text-anchor": "middle" }) +
    slopes
  );
}

function renderBumpChart(spec: VisualSpec, theme: VisualTheme): string {
  const source = extractPoints(spec, 12).slice(0, 6);
  const tall = spec.export.height / spec.export.width > 1.15;
  const categories = source.map((point) => point.label.slice(0, 6));
  const periods = ["Q1", "Q2", "Q3", "Q4"];
  const plot = { x: 90, y: tall ? 188 : 142, width: spec.export.width - 180, height: spec.export.height - (tall ? 318 : 238) };
  const xStep = plot.width / Math.max(periods.length - 1, 1);
  const rankStep = plot.height / Math.max(categories.length - 1, 1);

  const rankings = periods.map((_, periodIndex) => {
    return source
      .map((point, index) => ({
        index,
        score: point.value + Math.sin(periodIndex * 1.4 + index * 0.9) * 18 + periodIndex * (index % 2 === 0 ? 3 : -2)
      }))
      .sort((a, b) => b.score - a.score)
      .reduce<number[]>((rankByIndex, item, rank) => {
        rankByIndex[item.index] = rank;
        return rankByIndex;
      }, []);
  });

  const rankLines = categories
    .map((label, index) => {
      const coordinates = periods.map((_, periodIndex) => ({
        x: plot.x + periodIndex * xStep,
        y: plot.y + (rankings[periodIndex][index] ?? index) * rankStep
      }));
      const color = theme.palette[index % theme.palette.length];
      const first = coordinates[0];
      const last = coordinates[coordinates.length - 1];
      return (
        path({ d: smoothPath(coordinates), fill: "none", stroke: color, "stroke-width": 2.5, "stroke-linecap": "round", "stroke-linejoin": "round" }) +
        coordinates.map((coord) => circle({ cx: Number(coord.x.toFixed(2)), cy: Number(coord.y.toFixed(2)), r: 4, fill: theme.surface, stroke: color, "stroke-width": 2 })).join("") +
        textNode(label, {
          x: first.x - 12,
          y: Number((first.y + 5).toFixed(2)),
          fill: theme.text,
          "font-size": 12,
          "font-family": DASHBOARD_FONT,
          "text-anchor": "end"
        }) +
        textNode(`#${(rankings[periods.length - 1][index] ?? index) + 1}`, {
          x: last.x + 12,
          y: Number((last.y + 5).toFixed(2)),
          fill: color,
          "font-size": 12,
          "font-family": DASHBOARD_FONT,
          "font-weight": 700
        })
      );
    })
    .join("");

  const grid = periods
    .map((period, index) => {
      const x = plot.x + index * xStep;
      return (
        line({ x1: x, x2: x, y1: plot.y, y2: plot.y + plot.height, stroke: "#e5e7eb", "stroke-width": 1 }) +
        textNode(period, { x, y: plot.y + plot.height + 28, fill: "#52525b", "font-size": 13, "font-family": DASHBOARD_FONT, "text-anchor": "middle" })
      );
    })
    .join("");

  return grid + rankLines;
}

function renderTimelineChart(spec: VisualSpec, theme: VisualTheme): string {
  const points = extractPoints(spec, 18);
  const tall = spec.export.height / spec.export.width > 1.15;
  const plot = { x: 72, y: tall ? 188 : 142, width: spec.export.width - 144, height: spec.export.height - (tall ? 318 : 238) };
  const baselineY = plot.y + plot.height * 0.62;
  const max = maxAbs(points);
  const step = points.length > 1 ? plot.width / (points.length - 1) : 0;

  const events = points
    .map((point, index) => {
      const x = plot.x + index * step;
      const stem = 22 + (Math.max(0, point.value) / max) * (plot.height * 0.42);
      const y = baselineY - stem;
      const color = theme.palette[index % theme.palette.length];
      const showLabel = index === 0 || index === points.length - 1 || index % Math.ceil(points.length / 6) === 0;
      return group(
        line({ x1: x, x2: x, y1: baselineY, y2: Number(y.toFixed(2)), stroke: color, "stroke-width": 2, opacity: 0.72 }) +
          circle({ cx: x, cy: Number(y.toFixed(2)), r: 6, fill: color }) +
          (showLabel
            ? textNode(point.label.slice(-5), {
                x,
                y: baselineY + 28,
                fill: "#52525b",
                "font-size": 12,
                "font-family": DASHBOARD_FONT,
                "text-anchor": "middle"
              })
            : "") +
          (showLabel
            ? textNode(formatNumber(point.value), {
                x,
                y: Number((y - 12).toFixed(2)),
                fill: theme.text,
                "font-size": 12,
                "font-family": DASHBOARD_FONT,
                "text-anchor": "middle",
                "font-weight": 650
              })
            : "")
      );
    })
    .join("");

  return (
    rect({ x: plot.x, y: baselineY - 2, width: plot.width, height: 4, rx: 2, fill: "#e5e7eb" }) +
    events
  );
}

function dashboardPlot(spec: VisualSpec) {
  const tall = spec.export.height / spec.export.width > 1.15;
  return { x: 64, y: tall ? 190 : 150, width: spec.export.width - 128, height: spec.export.height - (tall ? 318 : 238) };
}

function renderEndpointLabels(points: ReturnType<typeof extractPoints>, plot: { x: number; y: number; width: number; height: number }, theme: VisualTheme): string {
  if (!points.length) return "";
  return (
    textNode(points[0].label.slice(0, 12), {
      x: plot.x,
      y: plot.y + plot.height + 26,
      fill: theme.muted,
      "font-size": theme.typography.label,
      "font-family": DASHBOARD_FONT
    }) +
    textNode(points[points.length - 1].label.slice(0, 12), {
      x: plot.x + plot.width,
      y: plot.y + plot.height + 26,
      fill: theme.muted,
      "font-size": theme.typography.label,
      "font-family": DASHBOARD_FONT,
      "text-anchor": "end"
    })
  );
}

function formatNumber(value: number): string {
  return Number.isInteger(value) ? value.toLocaleString("zh-CN") : value.toLocaleString("zh-CN", { maximumFractionDigits: 1 });
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
