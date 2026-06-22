import { stagger } from "@/lib/motion/timeline";
import { animate, escapeXml, group, path, rect, tag, textNode } from "@/lib/motion/svgPrimitives";
import { extractPoints, gridLines, maxAbs } from "@/lib/motion/renderUtils";
import type { CardMetric, VisualSpec } from "@/lib/visual/visualSpec";
import type { VisualTheme } from "@/lib/visual/themes";

const DASHBOARD_FONT = "Noto Sans CJK SC, PingFang SC, Microsoft YaHei, Arial, sans-serif";

export function renderAnimatedBar(spec: VisualSpec, theme: VisualTheme): string {
  if (theme.id === "editorial-light") {
    if (spec.type === "stacked-bar") return renderDashboardStackedBar(spec, theme);
    if (spec.type === "grouped-bar") return renderDashboardGroupedBar(spec, theme);
    if (spec.type === "waterfall") return renderDashboardWaterfall(spec, theme);
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
            y: Number(y.toFixed(2)),
            width: Number(barWidth.toFixed(2)),
            height: Number(height.toFixed(2)),
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
            fontFamily: "Noto Sans CJK SC, PingFang SC, Microsoft YaHei, Arial, sans-serif"
          }) +
          textNode(
            point.value.toLocaleString(),
            {
              x: Number((x + barWidth / 2).toFixed(2)),
              y: Number((y - 10).toFixed(2)),
              fill: theme.text,
              opacity: 1,
              "font-size": theme.typography.label,
              "font-family": "Noto Sans CJK SC, PingFang SC, Microsoft YaHei, Arial, sans-serif",
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
  const tall = height / width > 1.15;
  const points = extractPoints(spec, 200);
  const values = points.map((point) => Math.max(0, point.value));
  const maxValue = maxAbs(points);
  const tickMax = maxValue <= 60 ? 60 : Math.ceil((maxValue * 1.12) / 4) * 4;
  const metrics = (spec.card?.metrics ?? []).slice(0, 4);
  const hasMetrics = metrics.length > 0;
  const plotTop = hasMetrics ? (tall ? 354 : Math.min(216, Math.max(190, height * 0.42))) : tall ? 210 : 122;
  const plotBottom = height - (tall ? 122 : 84);
  const plot = {
    x: tall ? 84 : 88,
    y: plotTop,
    width: width - (tall ? 168 : 176),
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
          fill: "#8a93a4",
          "font-size": 12,
          "font-family": DASHBOARD_FONT,
          "text-anchor": "end"
        }) +
        path({
          d: `M ${plot.x} ${y.toFixed(2)} H ${plot.x + plot.width}`,
          fill: "none",
          stroke: "#edf1f6",
          "stroke-width": 0.9
        })
      );
    })
    .join("");

  const kpis = hasMetrics ? renderKpiStrip(metrics, width, tall ? 196 : 112, tall) : "";

  const periodLabel = spec.card?.periodLabel?.slice(0, 24);
  const pillWidth = Math.min(186, Math.max(98, (periodLabel?.length ?? 0) * 10 + 48));
  const filterPill = periodLabel
    ? rect({ x: width - pillWidth - 44, y: tall ? 114 : 38, width: pillWidth, height: 36, rx: 18, fill: "#eef2f7" }) +
      textNode(periodLabel, {
        x: width - pillWidth / 2 - 44,
        y: tall ? 138 : 63,
        fill: "#2f3747",
        "font-size": tall ? 13 : 14,
        "font-family": DASHBOARD_FONT,
        "font-weight": 560,
        "text-anchor": "middle"
      })
    : "";
  const maxIndex = values.indexOf(Math.max(...values));
  const lastIndex = Math.max(0, points.length - 1);

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
      const fill = barFill(theme, index, points.length, maxIndex, lastIndex);
      const showValue = points.length <= 14 && barHeight > 22;
      return (
        rect(
          {
            x: Number(x.toFixed(2)),
            y: Number(y.toFixed(2)),
            width: Number(barWidth.toFixed(2)),
            height: Number(barHeight.toFixed(2)),
            rx: Math.min(theme.barRadius, Number((barWidth * 0.38).toFixed(2))),
            fill: fill.color,
            opacity: fill.opacity
          },
          animate("height", 0, Number(barHeight.toFixed(2)), spec.motion.durationMs, delay, spec.motion) +
            animate("y", baseY, Number(y.toFixed(2)), spec.motion.durationMs, delay, spec.motion)
        ) +
        (showValue
          ? textNode(formatTick(value), {
              x: Number((x + barWidth / 2).toFixed(2)),
              y: Number((y - 9).toFixed(2)),
              fill: index === maxIndex ? "#f06a3f" : "#74809a",
              "font-size": 12,
              "font-family": DASHBOARD_FONT,
              "font-weight": 520,
              "text-anchor": "middle"
            })
          : "") +
        renderAdaptiveAxisLabel(label, {
          x: x + barWidth / 2,
          y: baseY + 28,
          slot,
          index,
          count: points.length,
          fill: "#697386",
          fontSize: slot < 18 ? 10 : 12,
          fontFamily: DASHBOARD_FONT
        })
      );
    })
    .join("");

  return filterPill + kpis + grid + bars;
}

function renderDashboardStackedBar(spec: VisualSpec, theme: VisualTheme): string {
  const width = spec.export.width;
  const height = spec.export.height;
  const tall = height / width > 1.15;
  const points = extractPoints(spec, 200);
  const plot = { x: 88, y: tall ? 184 : 138, width: width - 176, height: Math.max(150, height - (tall ? 316 : 232)) };
  const baseY = plot.y + plot.height;
  const tickMax = Math.ceil(maxAbs(points) / 10) * 10 || 10;
  const band = barBandLayout(plot.x, plot.width, points.length, { compact: true });
  const segments = ["自然", "付费", "留存"];

  const bars = points
    .map((point, index) => {
      const totalHeight = Math.max(4, (Math.max(0, point.value) / tickMax) * plot.height);
      const shares = stackShares(index);
      const x = band.startX + index * band.slot;
      let yCursor = baseY;
      const delay = stagger(index, spec.motion.delayMs, Math.max(36, spec.motion.staggerMs));
      const stacks = shares
        .map((share, segmentIndex) => {
          const segmentHeight = Math.max(2, totalHeight * share);
          yCursor -= segmentHeight;
          return rect(
            {
              x: Number(x.toFixed(2)),
              y: Number(yCursor.toFixed(2)),
              width: Number(band.barWidth.toFixed(2)),
              height: Number(segmentHeight.toFixed(2)),
              rx: segmentIndex === 0 ? Number((band.barWidth / 2).toFixed(2)) : 2,
              fill: theme.palette[segmentIndex % theme.palette.length],
              opacity: 0.95
            },
            animate("height", 0, Number(segmentHeight.toFixed(2)), spec.motion.durationMs, delay + segmentIndex * 55, spec.motion) +
              animate("y", baseY, Number(yCursor.toFixed(2)), spec.motion.durationMs, delay + segmentIndex * 55, spec.motion)
          );
        })
        .join("");
      const rawLabel = point.label.match(/(?:^|[-/])(\d{1,2})$/)?.[1]?.padStart(2, "0") ?? point.label;

      return (
        stacks +
        renderAdaptiveAxisLabel(rawLabel, {
          x: x + band.barWidth / 2,
          y: baseY + 34,
          slot: band.slot,
          index,
          count: points.length,
          fill: "#3f3f46",
          fontSize: band.slot < 18 ? 11 : 14,
          fontFamily: DASHBOARD_FONT
        })
      );
    })
    .join("");

  return dashboardGrid(plot, tickMax) + renderLegend(segments, theme, width, tall ? 160 : 116) + bars;
}

function renderDashboardGroupedBar(spec: VisualSpec, theme: VisualTheme): string {
  const width = spec.export.width;
  const height = spec.export.height;
  const tall = height / width > 1.15;
  const points = extractPoints(spec, 200);
  const plot = { x: 88, y: tall ? 184 : 138, width: width - 176, height: Math.max(150, height - (tall ? 316 : 232)) };
  const baseY = plot.y + plot.height;
  const maxValue = maxAbs(points) * 1.2;
  const tickMax = Math.ceil(maxValue / 10) * 10 || 10;
  const band = barBandLayout(plot.x, plot.width, points.length, { compact: true });
  const series = ["本期", "上期", "目标"];
  const groupGap = Math.max(1.5, Math.min(4, band.barWidth * 0.18));
  const innerWidth = Math.max(2, (band.barWidth - groupGap * 2) / 3);

  const bars = points
    .map((point, index) => {
      const x = band.startX + index * band.slot;
      const values = [point.value * 0.72, point.value, point.value * (0.86 + (index % 3) * 0.12)];
      const delay = stagger(index, spec.motion.delayMs, Math.max(36, spec.motion.staggerMs));
      const grouped = values
        .map((value, seriesIndex) => {
          const barHeight = Math.max(3, (Math.max(0, value) / tickMax) * plot.height);
          const barX = x + seriesIndex * (innerWidth + groupGap);
          const y = baseY - barHeight;
          return rect(
            {
              x: Number(barX.toFixed(2)),
              y: Number(y.toFixed(2)),
              width: Number(innerWidth.toFixed(2)),
              height: Number(barHeight.toFixed(2)),
              rx: Number((innerWidth / 2).toFixed(2)),
              fill: theme.palette[seriesIndex % theme.palette.length]
            },
            animate("height", 0, Number(barHeight.toFixed(2)), spec.motion.durationMs, delay + seriesIndex * 45, spec.motion) +
              animate("y", baseY, Number(y.toFixed(2)), spec.motion.durationMs, delay + seriesIndex * 45, spec.motion)
          );
        })
        .join("");
      const rawLabel = point.label.match(/(?:^|[-/])(\d{1,2})$/)?.[1]?.padStart(2, "0") ?? point.label;
      return (
        grouped +
        renderAdaptiveAxisLabel(rawLabel, {
          x: x + band.barWidth / 2,
          y: baseY + 34,
          slot: band.slot,
          index,
          count: points.length,
          fill: "#3f3f46",
          fontSize: band.slot < 18 ? 11 : 14,
          fontFamily: DASHBOARD_FONT
        })
      );
    })
    .join("");

  return dashboardGrid(plot, tickMax) + renderLegend(series, theme, width, tall ? 160 : 116) + bars;
}

function renderDashboardWaterfall(spec: VisualSpec, theme: VisualTheme): string {
  const width = spec.export.width;
  const height = spec.export.height;
  const tall = height / width > 1.15;
  const points = extractPoints(spec, 200).slice(0, 16);
  const plot = { x: 82, y: tall ? 184 : 136, width: width - 164, height: Math.max(150, height - (tall ? 318 : 230)) };
  const band = barBandLayout(plot.x, plot.width, points.length, { compact: true });
  const deltas = points.map((point, index) => (index === 0 ? point.value : point.value - points[index - 1].value));
  let running = 0;
  const steps = deltas.map((delta, index) => {
    const start = running;
    running += delta;
    return { point: points[index], delta, start, end: running };
  });
  const min = Math.min(0, ...steps.flatMap((step) => [step.start, step.end]));
  const max = Math.max(1, ...steps.flatMap((step) => [step.start, step.end]));
  const range = max - min || 1;
  const yFor = (value: number) => plot.y + plot.height - ((value - min) / range) * plot.height;
  const zeroY = yFor(0);

  const bars = steps
    .map((step, index) => {
      const x = band.startX + index * band.slot;
      const y1 = yFor(step.start);
      const y2 = yFor(step.end);
      const y = Math.min(y1, y2);
      const barHeight = Math.max(3, Math.abs(y2 - y1));
      const positive = step.delta >= 0;
      const delay = stagger(index, spec.motion.delayMs, Math.max(42, spec.motion.staggerMs));
      const nextX = band.startX + (index + 1) * band.slot;
      const connector =
        index < steps.length - 1
          ? path({
              d: `M ${(x + band.barWidth).toFixed(2)} ${y2.toFixed(2)} H ${nextX.toFixed(2)}`,
              fill: "none",
              stroke: "#cbd5e1",
              "stroke-width": 1.4,
              "stroke-dasharray": "4 5"
            })
          : "";
      const rawLabel = step.point.label.match(/(?:^|[-/])(\d{1,2})$/)?.[1]?.padStart(2, "0") ?? step.point.label;

      return (
        connector +
        rect(
          {
            x: Number(x.toFixed(2)),
            y: Number(y.toFixed(2)),
            width: Number(band.barWidth.toFixed(2)),
            height: Number(barHeight.toFixed(2)),
            rx: 5,
            fill: positive ? "#14b8a6" : "#f97316",
            opacity: 0.96
          },
          animate("height", 0, Number(barHeight.toFixed(2)), spec.motion.durationMs, delay, spec.motion) +
            animate("y", zeroY, Number(y.toFixed(2)), spec.motion.durationMs, delay, spec.motion)
        ) +
        renderAdaptiveAxisLabel(rawLabel, {
          x: x + band.barWidth / 2,
          y: plot.y + plot.height + 34,
          slot: band.slot,
          index,
          count: steps.length,
          fill: "#3f3f46",
          fontSize: band.slot < 18 ? 11 : 14,
          fontFamily: DASHBOARD_FONT
        })
      );
    })
    .join("");

  return (
    dashboardWaterfallGrid(plot, min, max, yFor) +
    path({ d: `M ${plot.x} ${zeroY.toFixed(2)} H ${plot.x + plot.width}`, fill: "none", stroke: "#94a3b8", "stroke-width": 1.3 }) +
    renderLegend(["增加", "减少"], { ...theme, palette: ["#14b8a6", "#f97316"] }, width, tall ? 160 : 116) +
    bars
  );
}

function dashboardGrid(plot: { x: number; y: number; width: number; height: number }, tickMax: number): string {
  const ticks = [0, tickMax * 0.25, tickMax * 0.5, tickMax * 0.75, tickMax];
  const baseY = plot.y + plot.height;
  return ticks
    .map((tick) => {
      const y = baseY - (tick / tickMax) * plot.height;
      return (
        textNode(formatTick(tick), {
          x: plot.x - 18,
          y: Number((y + 5).toFixed(2)),
          fill: "#697386",
          "font-size": 14,
          "font-family": DASHBOARD_FONT,
          "text-anchor": "end"
        }) +
        path({ d: `M ${plot.x} ${y.toFixed(2)} H ${plot.x + plot.width}`, fill: "none", stroke: "#edf1f6", "stroke-width": 1 })
      );
    })
    .join("");
}

function dashboardWaterfallGrid(plot: { x: number; y: number; width: number; height: number }, min: number, max: number, yFor: (value: number) => number): string {
  const ticks = [min, min + (max - min) * 0.5, max];
  return ticks
    .map((tick) => {
      const y = yFor(tick);
      return (
        textNode(formatTick(tick), {
          x: plot.x - 18,
          y: Number((y + 5).toFixed(2)),
          fill: "#697386",
          "font-size": 14,
          "font-family": DASHBOARD_FONT,
          "text-anchor": "end"
        }) +
        path({ d: `M ${plot.x} ${y.toFixed(2)} H ${plot.x + plot.width}`, fill: "none", stroke: "#edf1f6", "stroke-width": 1 })
      );
    })
    .join("");
}

function renderLegend(labels: string[], theme: VisualTheme, width: number, y: number): string {
  const itemWidth = 84;
  const startX = width - 52 - labels.length * itemWidth;
  return labels
    .map((label, index) =>
      group(
        rect({ x: startX + index * itemWidth, y: y - 9, width: 20, height: 8, rx: 4, fill: theme.palette[index % theme.palette.length] }) +
          textNode(label, {
            x: startX + index * itemWidth + 28,
            y,
            fill: "#697386",
            "font-size": 13,
            "font-family": DASHBOARD_FONT,
            "font-weight": 580
          })
      )
    )
    .join("");
}

function renderKpiStrip(metrics: CardMetric[], width: number, top: number, tall: boolean): string {
  const left = tall ? 48 : 40;
  const gap = tall ? 12 : 10;
  const available = width - left * 2 - gap * (metrics.length - 1);
  const primaryWidth = tall && metrics.length > 1 ? Math.min(266, Math.max(224, available * 0.42)) : available / Math.max(1, metrics.length);
  const secondaryWidth = metrics.length > 1 ? (available - primaryWidth) / (metrics.length - 1) : primaryWidth;
  const itemHeight = tall ? 96 : 76;

  return metrics
    .map((metric, index) => {
      const itemWidth = index === 0 ? primaryWidth : secondaryWidth;
      const x = index === 0 ? left : left + primaryWidth + gap + (index - 1) * (secondaryWidth + gap);
      const value = formatMetricValue(metric.value, metric.prefix, metric.suffix);
      const trend = metricTrend(metric);
      const valueSize = tall ? (index === 0 ? 30 : metrics.length > 3 ? 21 : 24) : index === 0 ? 24 : metrics.length > 3 ? 20 : 22;

      return (
        rect({
          x,
          y: top,
          width: Number(itemWidth.toFixed(2)),
          height: itemHeight,
          rx: 18,
          fill: index === 0 ? "#f4f8ff" : "#fbfcfe",
          stroke: index === 0 ? "#dce8ff" : "#edf1f6",
          "stroke-width": 0.8
        }) +
        textNode(metric.label, {
          x: x + (index === 0 ? 18 : 16),
          y: top + (tall ? 27 : 25),
          fill: "#7b8496",
          "font-size": tall ? 12 : 11,
          "font-family": DASHBOARD_FONT,
          "font-weight": 500
        }) +
        textNode(value, {
          x: x + (index === 0 ? 18 : 16),
          y: top + (tall ? 66 : 55),
          fill: "#182033",
          "font-size": valueSize,
          "font-family": DASHBOARD_FONT,
          "font-weight": index === 0 ? 720 : 640
        }) +
        (trend
          ? textNode(trend.text, {
              x: Number((x + itemWidth - 18).toFixed(2)),
              y: top + (tall ? 65 : 54),
              fill: trend.fill,
              "font-size": tall ? 11 : 10,
              "font-family": DASHBOARD_FONT,
              "font-weight": 520,
              "text-anchor": "end"
            })
          : "")
      );
    })
    .join("");
}

function barFill(theme: VisualTheme, index: number, count: number, maxIndex: number, lastIndex: number): { color: string; opacity: number } {
  if (count <= 8) {
    return { color: theme.palette[index % theme.palette.length] ?? theme.accent, opacity: 0.94 };
  }
  if (index === maxIndex) return { color: theme.palette[2] ?? "#f06a3f", opacity: 1 };
  if (index === lastIndex) return { color: theme.palette[1] ?? "#16a394", opacity: 0.98 };
  return { color: theme.palette[0] ?? theme.accent, opacity: 0.62 };
}

function stackShares(index: number): [number, number, number] {
  const first = 0.48 + (index % 3) * 0.04;
  const second = 0.28 + (index % 2) * 0.05;
  return [first, second, Math.max(0.12, 1 - first - second)];
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
  const fill = trend === "down" ? "#d14343" : trend === "neutral" ? "#7b8496" : "#0f8a5f";
  return { text: `${icon} ${metric.delta}`, fill };
}
