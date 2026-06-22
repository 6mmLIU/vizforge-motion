import { animate, group, rect, textNode } from "@/lib/motion/svgPrimitives";
import { extractPoints, maxAbs, resolveFields, type Point } from "@/lib/motion/renderUtils";
import { stagger } from "@/lib/motion/timeline";
import type { VisualSpec } from "@/lib/visual/visualSpec";
import type { VisualTheme } from "@/lib/visual/themes";

const FONT = "Noto Sans CJK SC, PingFang SC, Microsoft YaHei, Arial, sans-serif";
const MONTH_LABELS = ["1月", "2月", "3月", "4月", "5月", "6月", "7月", "8月", "9月", "10月", "11月", "12月"];

type CalendarCell = {
  index: number;
  col: number;
  row: number;
  point?: Point;
  value: number;
  month?: number;
};

export function renderHeatmap(spec: VisualSpec, theme: VisualTheme): string {
  const points = extractPoints(spec, 400);
  const fields = resolveFields(spec);
  const dated = calendarCellsFromDates(points, fields.category);
  const cells = dated ?? calendarCellsFromOrder(points);
  const max = Math.max(maxAbs(points), 1);
  const weeks = Math.max(1, Math.max(...cells.map((cell) => cell.col), 0) + 1);
  const compact = spec.export.height <= 320;
  const tall = theme.id === "editorial-light" && spec.export.height / spec.export.width > 1.15;
  const plot = {
    x: 42,
    y: compact ? 82 : tall ? 224 : 132,
    width: spec.export.width - 84,
    height: spec.export.height - (compact ? 126 : tall ? 386 : 218)
  };
  const gap = weeks > 56 ? 2 : weeks > 38 ? 3 : tall ? 7 : 5;
  const cellSize = Math.max(4, Math.min(tall ? 30 : 12, (plot.width - Math.max(0, weeks - 1) * gap) / weeks));
  const gridWidth = weeks * cellSize + Math.max(0, weeks - 1) * gap;
  const gridHeight = 7 * cellSize + 6 * gap;
  const startX = plot.x + Math.max(0, (plot.width - gridWidth) / 2);
  const startY = tall
    ? plot.y + Math.max(148, Math.min(222, (plot.height - gridHeight) * 0.25))
    : plot.y + Math.max(0, Math.min(28, (plot.height - gridHeight - 34) / 2));

  const calendar = cells
    .map((cell) => {
      const x = startX + cell.col * (cellSize + gap);
      const y = startY + cell.row * (cellSize + gap);
      const delay = stagger(cell.index, spec.motion.delayMs, Math.min(18, spec.motion.staggerMs));
      return rect(
        {
          x: Number(x.toFixed(2)),
          y: Number(y.toFixed(2)),
          width: Number(cellSize.toFixed(2)),
          height: Number(cellSize.toFixed(2)),
          rx: Number(Math.max(2, cellSize * 0.28).toFixed(2)),
          fill: heatColor(cell.value, max, theme.accent),
          opacity: 1
        },
        animate("opacity", cell.value > 0 ? 0.24 : 0.72, 1, Math.min(520, spec.motion.durationMs), delay, { easing: "ease-out" })
      );
    })
    .join("");

  return group(renderTabs(spec.export.width, theme, tall ? startY - 72 : 62) + calendar + renderMonthLabels(cells, startX, startY + gridHeight + (tall ? 38 : 28), cellSize + gap, theme));
}

function calendarCellsFromDates(points: Point[], categoryField: string): CalendarCell[] | null {
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

  dated.forEach((item) => {
    byOffset.set(daysBetween(start, item.date), item);
  });

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

function calendarCellsFromOrder(points: Point[]): CalendarCell[] {
  return points.map((point, index) => ({
    index,
    col: Math.floor(index / 7),
    row: index % 7,
    point,
    value: Math.max(0, point.value)
  }));
}

function renderTabs(width: number, theme: VisualTheme, y: number): string {
  const labels = [
    { text: "每日", active: true },
    { text: "每周", active: false },
    { text: "累计", active: false }
  ];
  const startX = width - (y > 100 ? 214 : 170);

  return labels
    .map((label, index) =>
      textNode(label.text, {
        x: startX + index * (y > 100 ? 54 : 42),
        y,
        fill: label.active ? theme.text : theme.muted,
        "font-size": y > 100 ? 16 : 15,
        "font-family": FONT,
        "font-weight": label.active ? 660 : 520
      })
    )
    .join("");
}

function renderMonthLabels(cells: CalendarCell[], startX: number, y: number, columnStep: number, theme: VisualTheme): string {
  const byMonth = new Map<number, number>();

  cells.forEach((cell) => {
    if (cell.month === undefined) return;
    if (!cell.point) return;
    if (!byMonth.has(cell.month)) byMonth.set(cell.month, cell.col);
  });

  const labels =
    byMonth.size > 0
      ? Array.from(byMonth.entries()).map(([month, col]) => ({ label: MONTH_LABELS[month], col }))
      : fallbackMonthLabels(Math.max(...cells.map((cell) => cell.col), 0) + 1);

  return labels
    .map(({ label, col }) =>
      textNode(label, {
        x: Number((startX + col * columnStep).toFixed(2)),
        y: Number(y.toFixed(2)),
        fill: theme.muted,
        "font-size": 15,
        "font-family": FONT,
        "font-weight": 560
      })
    )
    .join("");
}

function fallbackMonthLabels(weeks: number) {
  const labels = ["7月", "8月", "9月", "10月", "11月", "12月", "1月", "2月", "3月", "4月", "5月", "6月"];
  return labels.map((label, index) => ({
    label,
    col: Math.round((index / Math.max(1, labels.length - 1)) * Math.max(0, weeks - 1))
  }));
}

function heatColor(value: number, max: number, accent: string): string {
  if (value <= 0) return "#eef2f7";
  const strength = Math.min(1, Math.max(0.08, value / max));
  const ratio = strength < 0.18 ? 0.18 : strength < 0.34 ? 0.34 : strength < 0.52 ? 0.55 : strength < 0.72 ? 0.78 : 1;
  return mixWithWhite(accent, ratio);
}

function mixWithWhite(hex: string, ratio: number): string {
  const rgb = hexToRgb(hex);
  if (!rgb) return hex;
  const t = Math.max(0, Math.min(1, ratio));
  const r = Math.round(255 + (rgb.r - 255) * t);
  const g = Math.round(255 + (rgb.g - 255) * t);
  const b = Math.round(255 + (rgb.b - 255) * t);
  return `#${[r, g, b].map((channel) => channel.toString(16).padStart(2, "0")).join("")}`;
}

function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const value = hex.trim().replace(/^#/, "");
  if (value.length === 3) {
    const r = parseInt(value[0] + value[0], 16);
    const g = parseInt(value[1] + value[1], 16);
    const b = parseInt(value[2] + value[2], 16);
    if ([r, g, b].some(Number.isNaN)) return null;
    return { r, g, b };
  }
  if (value.length === 6) {
    const r = parseInt(value.slice(0, 2), 16);
    const g = parseInt(value.slice(2, 4), 16);
    const b = parseInt(value.slice(4, 6), 16);
    if ([r, g, b].some(Number.isNaN)) return null;
    return { r, g, b };
  }
  return null;
}

function parseDate(value: unknown): Date | null {
  if (value instanceof Date && !Number.isNaN(value.getTime())) return value;
  const text = String(value ?? "").trim();
  const match = text.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})$/);
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]) - 1;
  const day = Number(match[3]);
  const date = new Date(Date.UTC(year, month, day));
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
