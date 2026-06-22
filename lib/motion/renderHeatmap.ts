import { animate, group, rect, textNode } from "@/lib/motion/svgPrimitives";
import { extractPoints, maxAbs, resolveFields, type Point } from "@/lib/motion/renderUtils";
import { stagger } from "@/lib/motion/timeline";
import { FONT, clamp, formatNumber, mix, readableOn, round, type Geom, type Rect } from "@/lib/motion/layout";
import type { VisualSpec } from "@/lib/visual/visualSpec";
import type { VisualTheme } from "@/lib/visual/themes";

const MONTH_LABELS = ["1月", "2月", "3月", "4月", "5月", "6月", "7月", "8月", "9月", "10月", "11月", "12月"];

type CalendarCell = {
  index: number;
  col: number;
  row: number;
  point?: Point;
  value: number;
  month?: number;
};

export function renderHeatmap(spec: VisualSpec, theme: VisualTheme, g: Geom): string {
  const points = extractPoints(spec, 400);
  const fields = resolveFields(spec);
  const cells = calendarCells(points, fields.category);
  if (!cells || points.length < 42) return renderMatrix(spec, theme, g, points);
  return renderCalendar(spec, theme, g, points, cells);
}

function lowColor(theme: VisualTheme): string {
  return theme.mode === "dark" ? "#1d2640" : "#e9eef7";
}

function heatColor(value: number, max: number, theme: VisualTheme): string {
  if (value <= 0) return theme.mode === "dark" ? "#161d33" : "#eef2f8";
  const strength = clamp(value / max, 0.08, 1);
  const ratio = strength < 0.2 ? 0.22 : strength < 0.4 ? 0.42 : strength < 0.6 ? 0.62 : strength < 0.8 ? 0.82 : 1;
  return mix(lowColor(theme), theme.accent, ratio);
}

function renderCalendar(spec: VisualSpec, theme: VisualTheme, g: Geom, points: Point[], cells: CalendarCell[]): string {
  const max = Math.max(maxAbs(points), 1);
  const weeks = Math.max(1, Math.max(...cells.map((cell) => cell.col), 0) + 1);
  const legendH = round(34 * g.s);
  const monthH = round(26 * g.s);
  const area: Rect = { x: g.plot.x, y: g.plot.y, width: g.plot.width, height: g.plot.height - legendH };
  const gap = weeks > 48 ? 2 : weeks > 32 ? 3 : 5;
  const cellByWidth = (area.width - (weeks - 1) * gap) / weeks;
  const cellByHeight = (area.height - monthH - 6 * gap) / 7;
  const cellSize = clamp(Math.min(cellByWidth, cellByHeight), 4, g.tall ? 30 : 22);
  const gridWidth = weeks * cellSize + (weeks - 1) * gap;
  const gridHeight = 7 * cellSize + 6 * gap;
  const startX = area.x + Math.max(0, (area.width - gridWidth) / 2);
  const startY = area.y + Math.max(0, (area.height - monthH - gridHeight) / 2);

  const calendar = cells
    .map((cell) => {
      const x = startX + cell.col * (cellSize + gap);
      const y = startY + cell.row * (cellSize + gap);
      const delay = stagger(cell.index, spec.motion.delayMs, Math.min(16, spec.motion.staggerMs));
      return rect(
        {
          x: round(x),
          y: round(y),
          width: round(cellSize),
          height: round(cellSize),
          rx: round(Math.max(2, cellSize * 0.26)),
          fill: heatColor(cell.value, max, theme),
          opacity: 1
        },
        animate("opacity", cell.value > 0 ? 0.28 : 0.7, 1, Math.min(520, spec.motion.durationMs), delay, { easing: "ease-out" })
      );
    })
    .join("");

  const monthLabels = renderMonthLabels(cells, startX, startY + gridHeight + round(20 * g.s), cellSize + gap, theme, g);
  const legend = renderIntensityLegend(theme, g, g.plot.x + g.plot.width, g.plot.y + g.plot.height);
  return group(calendar + monthLabels + legend);
}

function renderMatrix(spec: VisualSpec, theme: VisualTheme, g: Geom, points: Point[]): string {
  const legendH = round(34 * g.s);
  const area: Rect = { x: g.plot.x, y: g.plot.y, width: g.plot.width, height: g.plot.height - legendH };
  const max = Math.max(maxAbs(points), 1);
  const count = Math.max(1, points.length);
  const cols = count <= 4 ? 2 : g.tall ? 3 : Math.min(6, Math.ceil(Math.sqrt(count * 1.4)));
  const rows = Math.ceil(count / cols);
  const gap = round(10 * g.s);
  const cellWidth = (area.width - gap * (cols - 1)) / cols;
  const cellHeight = clamp((area.height - gap * (rows - 1)) / rows, 40, 150);
  const gridHeight = rows * cellHeight + (rows - 1) * gap;
  const startY = area.y + Math.max(0, (area.height - gridHeight) / 2);

  const tiles = points
    .map((point, index) => {
      const col = index % cols;
      const row = Math.floor(index / cols);
      const x = area.x + col * (cellWidth + gap);
      const y = startY + row * (cellHeight + gap);
      const value = Math.max(0, point.value);
      const fill = heatColor(value, max, theme);
      const ink = value / max >= 0.55 ? readableOn(mix(lowColor(theme), theme.accent, 0.9)) : theme.text;
      const delay = stagger(index, spec.motion.delayMs, Math.max(40, spec.motion.staggerMs));
      return (
        rect(
          {
            x: round(x),
            y: round(y),
            width: round(cellWidth),
            height: round(cellHeight),
            rx: round(12 * g.s),
            fill,
            stroke: theme.border,
            "stroke-width": 0.8
          },
          animate("opacity", 0.28, 1, Math.min(560, spec.motion.durationMs), delay, { easing: "ease-out" })
        ) +
        textNode(point.label.slice(0, 10), {
          x: round(x + cellWidth / 2),
          y: round(y + cellHeight / 2 - round(6 * g.s)),
          fill: ink,
          "font-size": Math.round(13 * g.s),
          "font-family": FONT,
          "font-weight": 640,
          "text-anchor": "middle"
        }) +
        textNode(formatNumber(value), {
          x: round(x + cellWidth / 2),
          y: round(y + cellHeight / 2 + round(18 * g.s)),
          fill: ink,
          "font-size": Math.round(18 * g.s),
          "font-family": FONT,
          "font-weight": 760,
          "text-anchor": "middle"
        })
      );
    })
    .join("");

  const legend = renderIntensityLegend(theme, g, g.plot.x + g.plot.width, g.plot.y + g.plot.height);
  return group(tiles + legend);
}

function renderIntensityLegend(theme: VisualTheme, g: Geom, rightX: number, bottomY: number): string {
  const size = round(13 * g.s);
  const gap = round(4 * g.s);
  const steps = [0.22, 0.42, 0.62, 0.82, 1];
  const fontSize = Math.round(12 * g.s);
  const swatchWidth = steps.length * (size + gap);
  const y = bottomY - size;
  const startX = rightX - swatchWidth - round(28 * g.s);
  const swatches = steps
    .map((ratio, index) =>
      rect({
        x: round(startX + index * (size + gap)),
        y: round(y),
        width: round(size),
        height: round(size),
        rx: round(3 * g.s),
        fill: mix(lowColor(theme), theme.accent, ratio)
      })
    )
    .join("");
  return (
    textNode("少", {
      x: round(startX - round(8 * g.s)),
      y: round(y + size * 0.82),
      fill: theme.soft,
      "font-size": fontSize,
      "font-family": FONT,
      "text-anchor": "end"
    }) +
    swatches +
    textNode("多", {
      x: round(startX + swatchWidth + round(6 * g.s)),
      y: round(y + size * 0.82),
      fill: theme.soft,
      "font-size": fontSize,
      "font-family": FONT
    })
  );
}

function renderMonthLabels(cells: CalendarCell[], startX: number, y: number, columnStep: number, theme: VisualTheme, g: Geom): string {
  const byMonth = new Map<number, number>();
  cells.forEach((cell) => {
    if (cell.month === undefined || !cell.point) return;
    if (!byMonth.has(cell.month)) byMonth.set(cell.month, cell.col);
  });
  if (byMonth.size === 0) return "";
  return Array.from(byMonth.entries())
    .map(([month, col]) =>
      textNode(MONTH_LABELS[month], {
        x: round(startX + col * columnStep),
        y: round(y),
        fill: theme.soft,
        "font-size": Math.round(12.5 * g.s),
        "font-family": FONT,
        "font-weight": 520
      })
    )
    .join("");
}

function calendarCells(points: Point[], categoryField: string): CalendarCell[] | null {
  const dated = points
    .map((point, index) => {
      const date = parseDate(point.raw[categoryField] ?? point.label);
      return date ? { point, index, date } : null;
    })
    .filter((item): item is { point: Point; index: number; date: Date } => Boolean(item));
  if (dated.length < Math.max(1, Math.ceil(points.length * 0.7))) return null;

  dated.sort((a, b) => a.date.getTime() - b.date.getTime());
  const start = startOfWeek(dated[0].date);
  const end = dated[dated.length - 1].date;
  const totalDays = daysBetween(start, end) + 1;
  const weeks = Math.max(1, Math.ceil(totalDays / 7));
  const byOffset = new Map<number, (typeof dated)[number]>();
  dated.forEach((item) => byOffset.set(daysBetween(start, item.date), item));

  return Array.from({ length: weeks * 7 }, (_, offset) => {
    const item = byOffset.get(offset);
    const date = addDays(start, offset);
    return {
      index: offset,
      col: Math.floor(offset / 7),
      row: offset % 7,
      point: item?.point,
      value: item ? Math.max(0, item.point.value) : 0,
      month: date.getUTCMonth()
    };
  });
}

function parseDate(value: unknown): Date | null {
  if (value instanceof Date && !Number.isNaN(value.getTime())) return value;
  const text = String(value ?? "").trim();
  const match = text.match(/^(\d{4})[-/](\d{1,2})(?:[-/](\d{1,2}))?$/);
  if (!match) return null;
  const date = new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3] ?? 1)));
  return Number.isNaN(date.getTime()) ? null : date;
}

function startOfWeek(date: Date): Date {
  const day = (date.getUTCDay() + 6) % 7;
  return addDays(date, -day);
}

function addDays(date: Date, days: number): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate() + days));
}

function daysBetween(start: Date, end: Date): number {
  return Math.round((Date.UTC(end.getUTCFullYear(), end.getUTCMonth(), end.getUTCDate()) - Date.UTC(start.getUTCFullYear(), start.getUTCMonth(), start.getUTCDate())) / 86400000);
}
