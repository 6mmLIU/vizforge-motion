import { animate, group, rect, textNode } from "@/lib/motion/svgPrimitives";
import { extractPoints, maxAbs } from "@/lib/motion/renderUtils";
import type { CardMetric, VisualSpec } from "@/lib/visual/visualSpec";
import type { VisualTheme } from "@/lib/visual/themes";

const DASHBOARD_FONT = "Noto Sans CJK SC, PingFang SC, Microsoft YaHei, Arial, sans-serif";

export function renderMetricCard(spec: VisualSpec, theme: VisualTheme): string {
  const width = spec.export.width;
  const height = spec.export.height;
  const tall = height / width > 1.15;
  const points = extractPoints(spec, 200);
  const primaryPoint = points[0] ?? { label: "指标", value: 0, raw: {} };
  const metrics = spec.card?.metrics ?? [];
  const primaryMetric = metrics[0];
  const primaryLabel = primaryMetric?.label ?? primaryPoint.label;
  const primaryValue = primaryMetric
    ? formatMetricValue(primaryMetric.value, primaryMetric.prefix, primaryMetric.suffix)
    : primaryPoint.value.toLocaleString("en-US");
  const trend = primaryMetric ? metricTrend(primaryMetric) : null;
  const periodPill = spec.card?.periodLabel ? renderPeriodPill(width, spec.card.periodLabel.slice(0, 24)) : "";
  const secondaryMetrics = metrics.slice(1, 4);
  const secondaryRow = secondaryMetrics.length ? renderSecondaryMetrics(secondaryMetrics, width, tall ? 356 : 258) : "";
  const sparkPanelTop = tall ? 488 : secondaryMetrics.length ? height - 158 : height - 176;
  const sparkPanelHeight = tall ? 300 : 118;
  const spark =
    points.length
      ? renderDataSparkPanel(points, theme, width, sparkPanelTop, sparkPanelHeight, spec.motion.delayMs, spec.motion.durationMs)
      : "";

  const trendText = trend
    ? textNode(trend.text, {
        x: Math.min(width - 160, 64 + primaryValue.length * (tall ? 31 : 27)),
        y: tall ? 282 : 188,
        fill: trend.fill,
        "font-size": tall ? 14 : 13,
        "font-family": DASHBOARD_FONT,
        "font-weight": 520
      })
    : "";

  return group(
    periodPill +
      textNode(primaryLabel, {
        x: 60,
        y: tall ? 206 : 146,
        fill: "#7b8496",
        "font-size": tall ? 15 : 14,
        "font-family": DASHBOARD_FONT,
        "font-weight": 460
      }) +
      textNode(
        primaryValue,
        {
          x: 58,
          y: tall ? 294 : 198,
          fill: theme.text,
          opacity: 1,
          "font-size": tall ? 58 : 46,
          "font-weight": 620,
          "font-family": DASHBOARD_FONT
        },
        animate("opacity", 0, 1, 420, spec.motion.delayMs + 180, { easing: "ease-out" }) +
          animate("y", tall ? 312 : 214, tall ? 294 : 198, 420, spec.motion.delayMs + 180, { easing: "ease-out" })
      ) +
      trendText +
      secondaryRow +
      spark
  );
}

function renderDataSparkPanel(points: ReturnType<typeof extractPoints>, theme: VisualTheme, width: number, top: number, height: number, delay: number, duration: number) {
  const panelX = 52;
  const panelWidth = width - 104;
  const heading = textNode("趋势概览", {
    x: panelX + 18,
    y: top + 34,
    fill: "#2f3747",
    "font-size": 15,
    "font-family": DASHBOARD_FONT,
    "font-weight": 560
  });
  return (
    rect({ x: panelX, y: top, width: panelWidth, height, rx: 24, fill: "#f8fafc", stroke: "#edf1f6", "stroke-width": 0.8 }) +
    heading +
    renderDataSparkBars(points, theme, width, top + 70, delay, duration, Math.max(74, height - 116))
  );
}

function renderDataSparkBars(points: ReturnType<typeof extractPoints>, theme: VisualTheme, width: number, top: number, delay: number, duration: number, plotHeight = 92) {
  const plot = {
    x: 76,
    y: top,
    width: width - 152,
    height: plotHeight
  };
  const max = maxAbs(points);
  const slot = plot.width / Math.max(points.length, 1);
  const barWidth = Math.max(points.length > 80 ? 1.5 : 3, Math.min(18, slot * 0.5));
  const baseY = plot.y + plot.height;

  const bars = points
    .map((point, index) => {
      const value = Math.max(0, point.value);
      const barHeight = Math.max(6, (value / max) * plot.height);
      const x = plot.x + index * slot + (slot - barWidth) / 2;
      const y = baseY - barHeight;
      return rect(
        {
          x: Number(x.toFixed(2)),
          y: Number(y.toFixed(2)),
          width: Number(barWidth.toFixed(2)),
          height: Number(barHeight.toFixed(2)),
          rx: Math.min(8, Number((barWidth * 0.4).toFixed(2))),
          fill: sparkBarColor(theme, index, points.length),
          opacity: points.length > 8 && index !== points.length - 1 ? 0.5 : 0.96
        },
        animate("height", 0, Number(barHeight.toFixed(2)), duration, delay + index * 36, { easing: "cinematic" }) +
          animate("y", baseY, Number(y.toFixed(2)), duration, delay + index * 36, { easing: "cinematic" })
      );
    })
    .join("");

  const firstLabel = points[0]?.label ? formatSmallLabel(points[0].label) : "";
  const lastLabel = points[points.length - 1]?.label ? formatSmallLabel(points[points.length - 1].label) : "";
  const axis =
    rect({ x: plot.x, y: baseY, width: plot.width, height: 1, fill: "#e6ebf2" }) +
    (firstLabel
      ? textNode(firstLabel, {
          x: plot.x,
          y: baseY + 28,
          fill: "#7b8496",
          "font-size": 12,
          "font-family": DASHBOARD_FONT
        })
      : "") +
    (lastLabel && lastLabel !== firstLabel
      ? textNode(lastLabel, {
          x: plot.x + plot.width,
          y: baseY + 28,
          fill: "#7b8496",
          "font-size": 12,
          "font-family": DASHBOARD_FONT,
          "text-anchor": "end"
        })
      : "");

  return axis + bars;
}

function renderSecondaryMetrics(metrics: CardMetric[], width: number, top: number): string {
  const gap = 18;
  const startX = 64;
  const available = width - 128 - gap * (metrics.length - 1);
  const itemWidth = available / metrics.length;

  return metrics
    .map((metric, index) => {
      const x = startX + index * (itemWidth + gap);
      const trend = metricTrend(metric);
      const value = formatMetricValue(metric.value, metric.prefix, metric.suffix);
      return (
        rect({ x: x - 12, y: top - 36, width: itemWidth + 6, height: 74, rx: 18, fill: "#fbfcfe", stroke: "#edf1f6", "stroke-width": 0.8 }) +
        textNode(value, {
          x,
          y: top,
          fill: "#182033",
          "font-size": 21,
          "font-family": DASHBOARD_FONT,
          "font-weight": 620
        }) +
        (trend
          ? textNode(trend.text, {
              x: x + Math.min(itemWidth - 34, Math.max(58, value.length * 12 + 14)),
              y: top - 2,
              fill: trend.fill,
              "font-size": 11,
              "font-family": DASHBOARD_FONT,
              "font-weight": 520
            })
          : "") +
        textNode(metric.label, {
          x,
          y: top + 28,
          fill: "#7b8496",
          "font-size": 12,
          "font-family": DASHBOARD_FONT
        })
      );
    })
    .join("");
}

function renderPeriodPill(width: number, label: string): string {
  const pillWidth = Math.min(186, Math.max(98, label.length * 10 + 48));
  const x = width - pillWidth - 44;
  return (
    rect({ x, y: 54, width: pillWidth, height: 38, rx: 19, fill: "#eef2f7" }) +
    textNode(label, {
      x: x + pillWidth / 2,
      y: 79,
      fill: "#2f3747",
      "font-size": 14,
      "font-family": DASHBOARD_FONT,
      "font-weight": 560,
      "text-anchor": "middle"
    })
  );
}

function formatMetricValue(value: string | number, prefix?: string, suffix?: string): string {
  const base = typeof value === "number" ? value.toLocaleString("en-US") : value;
  return `${prefix ?? ""}${base}${suffix ?? ""}`;
}

function metricTrend(metric: CardMetric): { text: string; fill: string } | null {
  if (metric.delta === undefined || metric.delta === null || metric.delta === "") return null;
  if (!metric.trend) return null;
  const icon = metric.trend === "down" ? "↓" : metric.trend === "neutral" ? "→" : "↑";
  const fill = metric.trend === "down" ? "#d14343" : metric.trend === "neutral" ? "#7b8496" : "#0f8a5f";
  return { text: `${icon} ${metric.delta}`, fill };
}

function sparkBarColor(theme: VisualTheme, index: number, count: number): string {
  if (count <= 8) return theme.palette[index % theme.palette.length] ?? theme.accent;
  if (index === count - 1) return theme.palette[1] ?? "#16a394";
  return theme.palette[0] ?? theme.accent;
}

function formatSmallLabel(label: string): string {
  const monthMatch = label.match(/(?:^|[-/])(\d{1,2})$/);
  if (monthMatch) return monthMatch[1].padStart(2, "0");
  return label.length > 10 ? `${label.slice(0, 9)}…` : label;
}
