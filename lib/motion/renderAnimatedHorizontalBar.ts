import { animate, group, rect, textNode } from "@/lib/motion/svgPrimitives";
import { extractPoints, maxAbs, type Point } from "@/lib/motion/renderUtils";
import { stagger } from "@/lib/motion/timeline";
import type { VisualSpec } from "@/lib/visual/visualSpec";
import type { VisualTheme } from "@/lib/visual/themes";

const FONT = "Inter, Microsoft YaHei, PingFang SC, Arial, sans-serif";

export function renderAnimatedHorizontalBar(spec: VisualSpec, theme: VisualTheme): string {
  const points = orderedPoints(extractPoints(spec, 200), spec.story === "ranking");
  if (theme.id === "editorial-light") return renderDashboardHorizontalBar(spec, theme, points);

  const plot = { x: 190, y: 132, width: spec.export.width - 260, height: spec.export.height - 232 };
  const max = maxAbs(points);
  const rowHeight = Math.min(42, plot.height / Math.max(points.length, 1));
  const barHeight = Math.max(points.length > 80 ? 1.5 : 3, Math.min(14, rowHeight * 0.52));

  return points
    .map((point, index) => {
      const y = plot.y + index * rowHeight + (rowHeight - barHeight) / 2;
      const targetWidth = Math.max(4, (Math.max(0, point.value) / max) * plot.width);
      const delay = stagger(index, spec.motion.delayMs, spec.motion.staggerMs);
      return group(
        (rowHeight >= 12 || index === 0 || index === points.length - 1
          ? textNode(fitText(point.label, 130, Math.min(theme.typography.label, Math.max(9, rowHeight * 0.72))), {
              x: plot.x - 16,
              y: Number((y + Math.max(8, barHeight * 0.72)).toFixed(2)),
              fill: theme.muted,
              "font-size": Math.min(theme.typography.label, Math.max(9, rowHeight * 0.72)),
              "font-family": FONT,
              "text-anchor": "end"
            })
          : "") +
          rect(
            {
              x: plot.x,
              y: Number(y.toFixed(2)),
              width: Number(targetWidth.toFixed(2)),
              height: Number(barHeight.toFixed(2)),
              rx: theme.barRadius,
              fill: theme.palette[index % theme.palette.length] ?? theme.accent,
              opacity: 0.94
            },
            animate("width", 0, Number(targetWidth.toFixed(2)), spec.motion.durationMs, delay, spec.motion)
          ) +
          (rowHeight >= 14
            ? textNode(point.value.toLocaleString(), {
                x: Number((plot.x + targetWidth + 12).toFixed(2)),
                y: Number((y + Math.max(8, barHeight * 0.72)).toFixed(2)),
                fill: theme.text,
                opacity: 1,
                "font-size": Math.min(theme.typography.label, Math.max(9, rowHeight * 0.72)),
                "font-family": FONT,
                "font-weight": 720
              },
              animate("opacity", 0, 1, 300, delay + spec.motion.durationMs - 120, { easing: "ease-out" }))
            : "")
      );
    })
    .join("");
}

function renderDashboardHorizontalBar(spec: VisualSpec, theme: VisualTheme, points: Point[]): string {
  const width = spec.export.width;
  const height = spec.export.height;
  const max = maxAbs(points);
  const plot = {
    x: 48,
    y: 124,
    width: width - 96,
    height: height - 186
  };
  const row = horizontalRowLayout(plot.height, points.length);
  const labelWidth = Math.min(156, Math.max(86, longestLabelWidth(points, row.labelSize) + 8));
  const valueWidth = Math.max(56, maxValueWidth(points, row.valueSize) + 10);
  const barX = plot.x + labelWidth + 18;
  const barWidth = Math.max(120, plot.width - labelWidth - valueWidth - 34);

  const rows = points
    .map((point, index) => {
      const rowTop = plot.y + index * row.step;
      const centerY = rowTop + row.step / 2;
      const barY = centerY - row.barHeight / 2;
      const targetWidth = Math.max(4, (Math.max(0, point.value) / max) * barWidth);
      const delay = stagger(index, spec.motion.delayMs, Math.max(32, Math.min(72, spec.motion.staggerMs)));
      const color = theme.palette[index % theme.palette.length] ?? theme.accent;

      return group(
        textNode(fitText(point.label, labelWidth, row.labelSize), {
          x: plot.x,
          y: Number((centerY + row.labelSize * 0.36).toFixed(2)),
          fill: theme.text,
          "font-size": row.labelSize,
          "font-family": FONT,
          "font-weight": 610
        }) +
          rect({
            x: Number(barX.toFixed(2)),
            y: Number(barY.toFixed(2)),
            width: Number(barWidth.toFixed(2)),
            height: Number(row.barHeight.toFixed(2)),
            rx: Number((row.barHeight / 2).toFixed(2)),
            fill: "#eef2f7"
          }) +
          rect(
            {
              x: Number(barX.toFixed(2)),
              y: Number(barY.toFixed(2)),
              width: Number(targetWidth.toFixed(2)),
              height: Number(row.barHeight.toFixed(2)),
              rx: Number((row.barHeight / 2).toFixed(2)),
              fill: color
            },
            animate("width", 0, Number(targetWidth.toFixed(2)), spec.motion.durationMs, delay, spec.motion)
          ) +
          textNode(formatValue(point.value), {
            x: Number((barX + barWidth + 16).toFixed(2)),
            y: Number((centerY + row.valueSize * 0.36).toFixed(2)),
            fill: theme.text,
            opacity: 1,
            "font-size": row.valueSize,
            "font-family": FONT,
            "font-weight": 680
          },
          animate("opacity", 0, 1, 300, delay + spec.motion.durationMs - 120, { easing: "ease-out" }))
      );
    })
    .join("");

  return rows;
}

function orderedPoints(points: Point[], ranking: boolean): Point[] {
  if (!ranking) return points;
  return [...points].sort((a, b) => b.value - a.value);
}

function horizontalRowLayout(plotHeight: number, count: number) {
  const safeCount = Math.max(1, count);
  const step = Math.min(46, Math.max(15, plotHeight / safeCount));
  const barHeight = Math.max(safeCount > 80 ? 2 : 5, Math.min(16, step * 0.38));
  const labelSize = Math.max(9, Math.min(15, safeCount > 28 ? 10 : safeCount > 14 ? 12 : 14));
  const valueSize = Math.max(9, Math.min(14, labelSize));
  return { step, barHeight, labelSize, valueSize };
}

function longestLabelWidth(points: Point[], fontSize: number): number {
  return points.reduce((max, point) => Math.max(max, estimatedTextWidth(point.label, fontSize)), 0);
}

function maxValueWidth(points: Point[], fontSize: number): number {
  return points.reduce((max, point) => Math.max(max, estimatedTextWidth(formatValue(point.value), fontSize)), 0);
}

function formatValue(value: number): string {
  return Number.isInteger(value) ? value.toLocaleString("en-US") : value.toLocaleString("en-US", { maximumFractionDigits: 1 });
}

function fitText(label: string, available: number, fontSize: number): string {
  const chars = [...label.trim()];
  if (!chars.length || estimatedTextWidth(label, fontSize) <= available) return label;
  const suffix = "...";
  let output = "";
  for (const char of chars) {
    if (estimatedTextWidth(output + char + suffix, fontSize) > available) break;
    output += char;
  }
  return output ? `${output}${suffix}` : suffix;
}

function estimatedTextWidth(value: string, fontSize: number): number {
  return [...value].reduce((width, char) => width + estimatedCharWidth(char, fontSize), 0);
}

function estimatedCharWidth(char: string, fontSize: number): number {
  if (/[\u2e80-\u9fff\uff00-\uffef]/u.test(char)) return fontSize;
  if (/\s/u.test(char)) return fontSize * 0.34;
  if (/[A-Z0-9]/u.test(char)) return fontSize * 0.64;
  if (/[a-z]/u.test(char)) return fontSize * 0.56;
  return fontSize * 0.5;
}
