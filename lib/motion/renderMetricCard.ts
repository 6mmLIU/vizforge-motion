import { animate, group, rect, textNode } from "@/lib/motion/svgPrimitives";
import { extractPoints, maxAbs } from "@/lib/motion/renderUtils";
import type { CardMetric, VisualSpec } from "@/lib/visual/visualSpec";
import type { VisualTheme } from "@/lib/visual/themes";

const DASHBOARD_FONT = "Inter, Microsoft YaHei, PingFang SC, Arial, sans-serif";

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
  const secondaryRow = secondaryMetrics.length ? renderSecondaryMetrics(secondaryMetrics, width, tall ? 354 : 270) : "";
  const sparkTop = tall ? height - 414 : secondaryMetrics.length ? height - 142 : height - 160;
  const spark = points.length ? renderDataSparkBars(points, theme, width, sparkTop, spec.motion.delayMs, spec.motion.durationMs, tall ? 236 : 92) : "";

  const trendText = trend
    ? textNode(trend.text, {
        x: Math.min(width - 160, 64 + primaryValue.length * (tall ? 34 : 28)),
        y: tall ? 246 : 188,
        fill: trend.fill,
        "font-size": tall ? 17 : 16,
        "font-family": DASHBOARD_FONT,
        "font-weight": 560
      })
    : "";

  return group(
    periodPill +
      textNode(primaryLabel, {
        x: 64,
        y: tall ? 184 : 146,
        fill: "#52525b",
        "font-size": tall ? 18 : 17,
        "font-family": DASHBOARD_FONT,
        "font-weight": 520
      }) +
      textNode(
        primaryValue,
        {
          x: 62,
          y: tall ? 260 : 198,
          fill: theme.text,
          opacity: 1,
          "font-size": tall ? 58 : 46,
          "font-weight": 760,
          "font-family": DASHBOARD_FONT
        },
        animate("opacity", 0, 1, 420, spec.motion.delayMs + 180, { easing: "ease-out" }) +
          animate("y", tall ? 278 : 214, tall ? 260 : 198, 420, spec.motion.delayMs + 180, { easing: "ease-out" })
      ) +
      trendText +
      secondaryRow +
      spark
  );
}

function renderDataSparkBars(points: ReturnType<typeof extractPoints>, theme: VisualTheme, width: number, top: number, delay: number, duration: number, plotHeight = 92) {
  const plot = {
    x: 64,
    y: top,
    width: width - 128,
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
          rx: Number((barWidth / 2).toFixed(2)),
          fill: theme.palette[index % theme.palette.length] ?? theme.accent,
          opacity: 0.88
        },
        animate("height", 0, Number(barHeight.toFixed(2)), duration, delay + index * 36, { easing: "cinematic" }) +
          animate("y", baseY, Number(y.toFixed(2)), duration, delay + index * 36, { easing: "cinematic" })
      );
    })
    .join("");

  const firstLabel = points[0]?.label ? formatSmallLabel(points[0].label) : "";
  const lastLabel = points[points.length - 1]?.label ? formatSmallLabel(points[points.length - 1].label) : "";
  const axis =
    rect({ x: plot.x, y: baseY, width: plot.width, height: 1, fill: "#e5e7eb" }) +
    (firstLabel
      ? textNode(firstLabel, {
          x: plot.x,
          y: baseY + 28,
          fill: "#52525b",
          "font-size": 13,
          "font-family": DASHBOARD_FONT
        })
      : "") +
    (lastLabel && lastLabel !== firstLabel
      ? textNode(lastLabel, {
          x: plot.x + plot.width,
          y: baseY + 28,
          fill: "#52525b",
          "font-size": 13,
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
        textNode(value, {
          x,
          y: top,
          fill: "#050505",
          "font-size": 22,
          "font-family": DASHBOARD_FONT,
          "font-weight": 720
        }) +
        (trend
          ? textNode(trend.text, {
              x: x + Math.min(itemWidth - 34, Math.max(58, value.length * 12 + 14)),
              y: top - 2,
              fill: trend.fill,
              "font-size": 13,
              "font-family": DASHBOARD_FONT,
              "font-weight": 540
            })
          : "") +
        textNode(metric.label, {
          x,
          y: top + 28,
          fill: "#52525b",
          "font-size": 14,
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
    rect({ x, y: 40, width: pillWidth, height: 48, rx: 20, fill: "#f0f1f3" }) +
    textNode(label, {
      x: x + pillWidth / 2,
      y: 71,
      fill: "#050505",
      "font-size": 18,
      "font-family": DASHBOARD_FONT,
      "font-weight": 650,
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
  const fill = metric.trend === "down" ? "#dc2626" : metric.trend === "neutral" ? "#71717a" : "#15803d";
  return { text: `${icon} ${metric.delta}`, fill };
}

function formatSmallLabel(label: string): string {
  const monthMatch = label.match(/(?:^|[-/])(\d{1,2})$/);
  if (monthMatch) return monthMatch[1].padStart(2, "0");
  return label.length > 10 ? `${label.slice(0, 9)}…` : label;
}
