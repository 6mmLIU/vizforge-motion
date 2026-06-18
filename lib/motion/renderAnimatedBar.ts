import { stagger } from "@/lib/motion/timeline";
import { animate, escapeXml, group, path, rect, tag, textNode } from "@/lib/motion/svgPrimitives";
import { extractPoints, gridLines, maxAbs } from "@/lib/motion/renderUtils";
import type { CardMetric, VisualSpec } from "@/lib/visual/visualSpec";
import type { VisualTheme } from "@/lib/visual/themes";

const DASHBOARD_FONT = "Inter, Microsoft YaHei, PingFang SC, Arial, sans-serif";

export function renderAnimatedBar(spec: VisualSpec, theme: VisualTheme): string {
  if (theme.id === "editorial-light") {
    return renderDashboardBar(spec, theme);
  }

  const width = spec.export.width;
  const points = extractPoints(spec, 200);
  const plot = { x: 78, y: 130, width: width - 156, height: spec.export.height - 230 };
  const max = maxAbs(points);
  const band = barBandLayout(plot.x, plot.width, points.length, { compact: false });
  const slot = band.slot;
  const barWidth = band.barWidth;
  const baseY = plot.y + plot.height;

  const bars = points
    .map((point, index) => {
      const height = Math.max(3, (Math.max(0, point.value) / max) * plot.height);
      const x = band.startX + index * band.slot;
      const y = baseY - height;
      const color = theme.palette[index % theme.palette.length];
      const delay = stagger(index, spec.motion.delayMs, spec.motion.staggerMs);
      return group(
        rect(
          {
            x: Number(x.toFixed(2)),
            y: baseY,
            width: Number(barWidth.toFixed(2)),
            height: 0,
            rx: theme.barRadius,
            fill: index === 0 ? "url(#vizforgeBar)" : color,
            opacity: 0.94
          },
          animate("height", 0, Number(height.toFixed(2)), spec.motion.durationMs, delay, spec.motion) +
            animate("y", baseY, Number(y.toFixed(2)), spec.motion.durationMs, delay, spec.motion)
        ) +
          renderAdaptiveAxisLabel(point.label, {
            x: x + barWidth / 2,
            y: baseY + 24,
            slot,
            index,
            count: points.length,
            fill: theme.muted,
            fontSize: theme.typography.label,
            fontFamily: "Inter, Arial, sans-serif"
          }) +
          textNode(
            point.value.toLocaleString(),
            {
              x: Number((x + barWidth / 2).toFixed(2)),
              y: Number((y - 10).toFixed(2)),
              fill: theme.text,
              opacity: 0,
              "font-size": theme.typography.label,
              "font-family": "Inter, Arial, sans-serif",
              "font-weight": 700,
              "text-anchor": "middle"
            },
            animate("opacity", 0, 1, 360, delay + spec.motion.durationMs - 120, { easing: "ease-out" })
          )
      );
    })
    .join("");

  return gridLines(plot, theme) + bars;
}

function renderDashboardBar(spec: VisualSpec, theme: VisualTheme): string {
  const width = spec.export.width;
  const height = spec.export.height;
  const points = extractPoints(spec, 200);
  const values = points.map((point) => Math.max(0, point.value));
  const maxValue = maxAbs(points);
  const tickMax = maxValue <= 60 ? 60 : Math.ceil(maxValue / 4) * 4;
  const metrics = (spec.card?.metrics ?? []).slice(0, 4);
  const hasMetrics = metrics.length > 0;
  const plotTop = hasMetrics ? Math.min(204, Math.max(182, height * 0.41)) : 122;
  const plotBottom = height - 84;
  const plot = {
    x: 88,
    y: plotTop,
    width: width - 176,
    height: Math.max(110, plotBottom - plotTop)
  };
  const baseY = plot.y + plot.height;
  const band = barBandLayout(plot.x, plot.width, points.length, { compact: true });
  const slot = band.slot;
  const barWidth = band.barWidth;
  const ticks = tickMax === 60 ? [0, 20, 40, 60] : [0, tickMax * 0.25, tickMax * 0.5, tickMax * 0.75, tickMax];

  const grid = ticks
    .map((tick) => {
      const y = baseY - (tick / tickMax) * plot.height;
      return (
        textNode(formatTick(tick), {
          x: plot.x - 18,
          y: Number((y + 5).toFixed(2)),
          fill: "#52525b",
          "font-size": 14,
          "font-family": DASHBOARD_FONT,
          "text-anchor": "end"
        }) +
        path({
          d: `M ${plot.x} ${y.toFixed(2)} H ${plot.x + plot.width}`,
          fill: "none",
          stroke: "#e5e7eb",
          "stroke-width": 1
        })
      );
    })
    .join("");

  const kpis = metrics
    .map((metric, index) => {
      const columnWidth = (width - 80) / metrics.length;
      const x = 40 + index * columnWidth;
      const value = formatMetricValue(metric.value, metric.prefix, metric.suffix);
      const trend = metricTrend(metric);
      const valueSize = metrics.length > 3 ? 25 : 28;
      const deltaX = x + Math.min(columnWidth - 54, Math.max(66, value.length * valueSize * 0.52 + 18));

      return (
        textNode(value, {
          x,
          y: 122,
          fill: theme.text,
          "font-size": valueSize,
          "font-family": DASHBOARD_FONT,
          "font-weight": 720
        }) +
        (trend
          ? textNode(trend.text, {
              x: Number(deltaX.toFixed(2)),
              y: 120,
              fill: trend.fill,
              "font-size": 15,
              "font-family": DASHBOARD_FONT,
              "font-weight": 520
            })
          : "") +
        textNode(metric.label, {
          x,
          y: 152,
          fill: "#52525b",
          "font-size": metrics.length > 3 ? 14 : 17,
          "font-family": DASHBOARD_FONT
        })
      );
    })
    .join("");

  const periodLabel = spec.card?.periodLabel?.slice(0, 24);
  const pillWidth = Math.min(216, Math.max(112, (periodLabel?.length ?? 0) * 12 + 54));
  const filterPill = periodLabel
    ? rect({ x: width - pillWidth - 40, y: 40, width: pillWidth, height: 48, rx: 20, fill: "#f0f1f3" }) +
      textNode(periodLabel, {
        x: width - pillWidth / 2 - 40,
        y: 71,
        fill: theme.text,
        "font-size": 18,
        "font-family": DASHBOARD_FONT,
        "font-weight": 650,
        "text-anchor": "middle"
      })
    : "";

  const bars = points
    .map((point, index) => {
      const value = values[index] ?? 0;
      const barHeight = Math.max(3, (value / tickMax) * plot.height);
      const x = band.startX + index * band.slot;
      const y = baseY - barHeight;
      const rawLabel = point.label || String(index + 1);
      const monthMatch = rawLabel.match(/(?:^|[-/])(\d{1,2})$/);
      const label = monthMatch ? monthMatch[1].padStart(2, "0") : rawLabel;
      const delay = stagger(index, spec.motion.delayMs, Math.max(35, spec.motion.staggerMs));
      return (
        rect(
          {
            x: Number(x.toFixed(2)),
            y: baseY,
            width: Number(barWidth.toFixed(2)),
            height: 0,
            rx: Number((barWidth / 2).toFixed(2)),
            fill: theme.palette[index % theme.palette.length] ?? theme.accent
          },
          animate("height", 0, Number(barHeight.toFixed(2)), spec.motion.durationMs, delay, spec.motion) +
            animate("y", baseY, Number(y.toFixed(2)), spec.motion.durationMs, delay, spec.motion)
        ) +
        renderAdaptiveAxisLabel(label, {
          x: x + barWidth / 2,
          y: baseY + 34,
          slot,
          index,
          count: points.length,
          fill: "#3f3f46",
          fontSize: slot < 18 ? 11 : 14,
          fontFamily: DASHBOARD_FONT
        })
      );
    })
    .join("");

  return filterPill + kpis + grid + bars;
}

function formatTick(value: number): string {
  return Number.isInteger(value) ? String(value) : value.toFixed(1);
}

function formatMetricValue(value: string | number, prefix?: string, suffix?: string): string {
  const base = typeof value === "number" ? value.toLocaleString("en-US") : value;
  return `${prefix ?? ""}${base}${suffix ?? ""}`;
}

function barBandLayout(plotX: number, plotWidth: number, count: number, options: { compact: boolean }) {
  const safeCount = Math.max(1, count);
  const maxBar = options.compact
    ? safeCount <= 4
      ? 42
      : safeCount <= 8
        ? 34
        : safeCount <= 16
          ? 26
          : safeCount <= 32
            ? 18
            : safeCount <= 80
              ? 9
              : 4
    : safeCount <= 4
      ? 46
      : safeCount <= 8
        ? 36
        : safeCount <= 16
          ? 28
          : safeCount <= 32
            ? 18
            : safeCount <= 80
              ? 9
              : 4;
  const minBar = safeCount > 80 ? 1.5 : safeCount > 48 ? 3 : 6;
  const gapRatio = safeCount <= 4 ? 1.18 : safeCount <= 8 ? 0.96 : safeCount <= 16 ? 0.76 : safeCount <= 32 ? 0.62 : 0.42;
  const rawBar = plotWidth / (safeCount + Math.max(0, safeCount - 1) * gapRatio);
  let barWidth = clamp(rawBar, minBar, maxBar);
  if (barWidth * safeCount > plotWidth) barWidth = Math.max(1.5, (plotWidth / safeCount) * 0.78);

  const maxGapFit = safeCount > 1 ? Math.max(0, (plotWidth - safeCount * barWidth) / (safeCount - 1)) : 0;
  const desiredGap = barWidth * gapRatio;
  const gap = safeCount > 1 ? Math.max(1.5, Math.min(desiredGap, maxGapFit)) : 0;
  const groupWidth = safeCount * barWidth + Math.max(0, safeCount - 1) * gap;
  const startX = plotX + Math.max(0, (plotWidth - groupWidth) / 2);

  return {
    startX,
    barWidth,
    gap,
    slot: barWidth + gap
  };
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function renderAdaptiveAxisLabel(
  value: string,
  options: {
    x: number;
    y: number;
    slot: number;
    index: number;
    count: number;
    fill: string;
    fontSize: number;
    fontFamily: string;
  }
): string {
  const layout = axisLabelLayout(value, options.slot, options.index, options.count, options.fontSize);
  if (!layout) return "";

  const x = Number(options.x.toFixed(2));
  const tspans = layout.lines
    .map((line, index) =>
      tag(
        "tspan",
        {
          x,
          dy: index === 0 ? 0 : Number((layout.fontSize + 2).toFixed(2))
        },
        escapeXml(line)
      )
    )
    .join("");

  return tag(
    "text",
    {
      x,
      y: Number(options.y.toFixed(2)),
      fill: options.fill,
      "font-size": layout.fontSize,
      "font-family": options.fontFamily,
      "text-anchor": "middle"
    },
    tspans
  );
}

function axisLabelLayout(value: string, slot: number, index: number, count: number, baseFontSize: number): { lines: string[]; fontSize: number } | null {
  const label = value.trim();
  if (!label) return null;
  const sampleEvery = slot < 14 || count > 60 ? Math.ceil(count / 18) : slot < 20 || count > 36 ? Math.ceil(count / 24) : 1;
  if (sampleEvery > 1 && index !== 0 && index !== count - 1 && index % sampleEvery !== 0) return null;

  const fontSize = Math.max(9, Math.min(baseFontSize, slot < 20 ? 10 : slot < 34 ? 11 : baseFontSize));
  const available = Math.max(12, slot * 0.82);
  if (estimatedTextWidth(label, fontSize) <= available) return { lines: [label], fontSize };

  const split = splitLabel(label);
  if (split && split.every((line) => estimatedTextWidth(line, fontSize) <= available)) return { lines: split, fontSize };

  const smaller = Math.max(8, fontSize - 2);
  if (estimatedTextWidth(label, smaller) <= available) return { lines: [label], fontSize: smaller };

  if (split && split.every((line) => estimatedTextWidth(line, smaller) <= available)) return { lines: split, fontSize: smaller };

  return { lines: [fitText(label, available, smaller)], fontSize: smaller };
}

function splitLabel(label: string): string[] | null {
  const clean = label.trim();
  if ([...clean].length <= 2) return null;
  const separator = clean.match(/^(.+?)[\s/_-]+(.+)$/);
  if (separator?.[1] && separator[2]) return [separator[1], separator[2]];
  const chars = [...clean];
  const midpoint = Math.ceil(chars.length / 2);
  return [chars.slice(0, midpoint).join(""), chars.slice(midpoint).join("")].filter(Boolean);
}

function fitText(label: string, available: number, fontSize: number): string {
  const chars = [...label.trim()];
  if (!chars.length) return "";
  if (estimatedTextWidth(label, fontSize) <= available) return label;
  const suffix = "…";
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

function metricTrend(metric: CardMetric): { text: string; fill: string } | null {
  if (metric.delta === undefined || metric.delta === null || metric.delta === "") return null;
  if (!metric.trend) return null;
  const trend = metric.trend;
  const icon = trend === "down" ? "↓" : trend === "neutral" ? "→" : "↑";
  const fill = trend === "down" ? "#dc2626" : trend === "neutral" ? "#71717a" : "#15803d";
  return { text: `${icon} ${metric.delta}`, fill };
}
