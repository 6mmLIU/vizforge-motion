import { coerceNumber } from "@/lib/data/inferSchema";
import { animate, circle, group, path, rect, textNode } from "@/lib/motion/svgPrimitives";
import { gridLines, maxAbs, resolveFields, type Point } from "@/lib/motion/renderUtils";
import type { VisualSpec } from "@/lib/visual/visualSpec";
import type { VisualTheme } from "@/lib/visual/themes";

const DASHBOARD_FONT = "Noto Sans CJK SC, PingFang SC, Microsoft YaHei, Arial, sans-serif";

type AreaSeries = {
  name: string;
  color: string;
  points: Point[];
};

export function renderAreaTrend(spec: VisualSpec, theme: VisualTheme): string {
  const width = spec.export.width;
  const height = spec.export.height;
  const tall = height / width > 1.15;
  const series = buildSeries(spec, theme);
  const allPoints = series.flatMap((item) => item.points);
  const maxValue = maxAbs(allPoints);
  const plot = {
    x: 62,
    y: tall ? 214 : spec.card?.periodLabel ? 148 : 132,
    width: width - 124,
    height: Math.max(150, height - (tall ? 344 : spec.card?.periodLabel ? 240 : 220))
  };
  const baseY = plot.y + plot.height;
  const periodLabel = spec.card?.periodLabel?.slice(0, 24);
  const periodPill = periodLabel ? renderPeriodPill(width, periodLabel) : "";
  const legend = series.length > 1 ? renderLegend(series, width, plot.y - 20) : "";
  const labels = renderXAxisLabels(series[0]?.points ?? [], plot);

  const seriesSvg = series
    .map((item, seriesIndex) => {
      const coordinates = pointsToCoordinates(item.points, plot, maxValue);
      const lineD = smoothPath(coordinates);
      const areaD = areaPath(lineD, coordinates, baseY);
      const delay = spec.motion.delayMs + seriesIndex * 140;
      const dots = coordinates
        .filter((_, index) => coordinates.length <= 18 || index % Math.ceil(coordinates.length / 18) === 0)
        .map((coord, index, visibleCoords) => {
          const dotDelay = delay + Math.round((spec.motion.durationMs * index) / Math.max(visibleCoords.length - 1, 1)) + 90;
          return circle(
            {
              cx: Number(coord.x.toFixed(2)),
              cy: Number(coord.y.toFixed(2)),
              r: series.length > 1 ? 2.6 : 3.2,
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
          {
            d: areaD,
            fill: item.color,
            opacity: series.length > 1 ? 0.14 : 0.18
          },
          animate("opacity", 0, series.length > 1 ? 0.14 : 0.18, 520, delay + 140, { easing: "ease-out" })
        ) +
        path(
          {
            d: lineD,
            fill: "none",
            stroke: item.color,
            "stroke-width": series.length > 1 ? 2.1 : 2.6,
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

  return periodPill + legend + gridLines(plot, theme) + group(seriesSvg + labels);
}

function buildSeries(spec: VisualSpec, theme: VisualTheme): AreaSeries[] {
  const fields = resolveFields(spec);
  const rows = spec.data.rows.slice(0, 200);
  const xField = spec.mappings?.x ?? fields.category;
  const yField = spec.mappings?.y ?? fields.value;
  const seriesField = spec.mappings?.series;
  const labels = orderedLabels(rows.map((row, index) => String(row[xField] ?? `Item ${index + 1}`)));

  if (seriesField) {
    const groups = new Map<string, Map<string, Point>>();
    rows.forEach((row, index) => {
      const label = String(row[xField] ?? `Item ${index + 1}`);
      const value = coerceNumber(row[yField]) ?? 0;
      const seriesName = String(row[seriesField] ?? "系列");
      const points = groups.get(seriesName) ?? new Map<string, Point>();
      const current = points.get(label);
      if (current) {
        current.value += value;
      } else {
        points.set(label, { label, value, raw: row });
      }
      groups.set(seriesName, points);
    });

    const eligible = Array.from(groups.entries())
      .filter(([, points]) => points.size >= Math.max(3, Math.ceil(labels.length * 0.5)))
      .slice(0, 200);

    if (eligible.length >= 2) {
      return eligible.map(([name, points], index) => ({
        name,
        color: theme.palette[index % theme.palette.length] ?? theme.accent,
        points: labels.map((label) => points.get(label) ?? { label, value: 0, raw: {} })
      }));
    }
  }

  const wideNumericFields = numericSeriesFields(rows, new Set([xField, seriesField ?? ""]));
  if (wideNumericFields.length >= 2) {
    return wideNumericFields.slice(0, 4).map((field, index) => ({
      name: field,
      color: theme.palette[index % theme.palette.length] ?? theme.accent,
      points: labels.map((label) => {
        const matchingRows = rows.filter((row, rowIndex) => String(row[xField] ?? `Item ${rowIndex + 1}`) === label);
        const value = matchingRows.reduce((sum, row) => sum + (coerceNumber(row[field]) ?? 0), 0);
        return { label, value, raw: matchingRows[0] ?? {} };
      })
    }));
  }

  const totals = new Map<string, Point>();
  rows.forEach((row, index) => {
    const label = String(row[xField] ?? `Item ${index + 1}`);
    const value = coerceNumber(row[yField]) ?? 0;
    const current = totals.get(label);
    if (current) {
      current.value += value;
    } else {
      totals.set(label, { label, value, raw: row });
    }
  });

  return [
    {
      name: "合计",
      color: theme.accent,
      points: Array.from(totals.values()).slice(0, 200)
    }
  ];
}

function numericSeriesFields(rows: Array<Record<string, unknown>>, excluded: Set<string>): string[] {
  const keys = Array.from(new Set(rows.flatMap((row) => Object.keys(row))));
  return keys.filter((key) => !excluded.has(key) && rows.some((row) => coerceNumber(row[key]) !== null));
}

function orderedLabels(labels: string[]): string[] {
  return Array.from(new Set(labels));
}

function pointsToCoordinates(
  points: Point[],
  plot: { x: number; y: number; width: number; height: number },
  maxValue: number
) {
  const step = points.length > 1 ? plot.width / (points.length - 1) : 0;
  return points.map((point, index) => ({
    x: plot.x + index * step,
    y: plot.y + plot.height - (Math.max(0, point.value) / maxValue) * plot.height,
    point
  }));
}

function areaPath(lineD: string, coordinates: Array<{ x: number; y: number }>, baseY: number): string {
  if (!coordinates.length) return "";
  const first = coordinates[0];
  const last = coordinates[coordinates.length - 1];
  return `${lineD} L ${last.x.toFixed(2)} ${baseY.toFixed(2)} L ${first.x.toFixed(2)} ${baseY.toFixed(2)} Z`;
}

function renderXAxisLabels(points: Point[], plot: { x: number; y: number; width: number; height: number }): string {
  if (!points.length) return "";
  const baseY = plot.y + plot.height + 32;
  const indexes = tickIndexes(points.length);
  return indexes
    .map((index) => {
      const step = points.length > 1 ? plot.width / (points.length - 1) : 0;
      const anchor = index === 0 ? "start" : index === points.length - 1 ? "end" : "middle";
      return textNode(formatAxisLabel(points[index].label), {
        x: Number((plot.x + step * index).toFixed(2)),
        y: baseY,
        fill: "#3f3f46",
        "font-size": 14,
        "font-family": DASHBOARD_FONT,
        "text-anchor": anchor
      });
    })
    .join("");
}

function tickIndexes(length: number): number[] {
  if (length <= 1) return [0];
  if (length <= 8) return Array.from({ length }, (_, index) => index);
  const indexes = new Set<number>([0, length - 1]);
  const slots = 5;
  for (let index = 1; index < slots; index += 1) {
    indexes.add(Math.round(((length - 1) * index) / slots));
  }
  return Array.from(indexes).sort((a, b) => a - b);
}

function formatAxisLabel(label: string): string {
  const monthMatch = label.match(/(?:^|[-/])(\d{1,2})$/);
  if (monthMatch) return monthMatch[1].padStart(2, "0");
  return label.length > 10 ? `${label.slice(0, 9)}…` : label;
}

function renderLegend(series: AreaSeries[], width: number, y: number): string {
  const visibleSeries = series.slice(0, 6);
  const itemWidth = 96;
  const startX = width - 54 - visibleSeries.length * itemWidth;
  return visibleSeries
    .map((item, index) => {
      const x = startX + index * itemWidth;
      return (
        circle({ cx: x, cy: y - 4, r: 4.5, fill: item.color }) +
        textNode(item.name.slice(0, 10), {
          x: x + 14,
          y,
          fill: "#697386",
          "font-size": 13,
          "font-family": DASHBOARD_FONT
        })
      );
    })
    .join("");
}

function renderPeriodPill(width: number, label: string): string {
  const pillWidth = Math.min(216, Math.max(112, label.length * 12 + 54));
  const x = width - pillWidth - 40;
  return (
    rect({ x, y: 40, width: pillWidth, height: 48, rx: 20, fill: "#eef2f7" }) +
    textNode(label, {
      x: x + pillWidth / 2,
      y: 71,
      fill: "#182033",
      "font-size": 18,
      "font-family": DASHBOARD_FONT,
      "font-weight": 650,
      "text-anchor": "middle"
    })
  );
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
      const tension = 0.2;
      const cp1x = previous.x + (point.x - previousPrevious.x) * tension;
      const cp1y = previous.y + (point.y - previousPrevious.y) * tension;
      const cp2x = point.x - (next.x - previous.x) * tension;
      const cp2y = point.y - (next.y - previous.y) * tension;
      return `C ${cp1x.toFixed(2)} ${cp1y.toFixed(2)} ${cp2x.toFixed(2)} ${cp2y.toFixed(2)} ${point.x.toFixed(2)} ${point.y.toFixed(2)}`;
    })
    .join(" ");
}
