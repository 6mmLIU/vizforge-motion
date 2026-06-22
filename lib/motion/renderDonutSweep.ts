import { stagger } from "@/lib/motion/timeline";
import { animate, circle, group, path, textNode } from "@/lib/motion/svgPrimitives";
import { describeArc, extractAggregatedPoints, maxAbs, totalPositive } from "@/lib/motion/renderUtils";
import type { VisualSpec } from "@/lib/visual/visualSpec";
import type { VisualTheme } from "@/lib/visual/themes";

const DASHBOARD_FONT = "Noto Sans CJK SC, PingFang SC, Microsoft YaHei, Arial, sans-serif";

function formatNumber(value: number): string {
  return value.toLocaleString("zh-CN", { maximumFractionDigits: value >= 10 ? 0 : 1 });
}

export function renderDonutSweep(spec: VisualSpec, theme: VisualTheme): string {
  const points = extractAggregatedPoints(spec, 200);
  const total = totalPositive(points);
  const dashboard = theme.id === "editorial-light";
  const tall = dashboard && spec.export.height / spec.export.width > 1.15;
  if (dashboard && spec.type === "pie") return renderPieChart(spec, theme, points, total);
  if (dashboard && spec.type === "arc") return renderArcBands(spec, theme, points);
  if (dashboard && spec.type === "gauge") return renderGauge(spec, theme, total);

  const cx = dashboard ? (tall ? spec.export.width / 2 : spec.export.width * 0.38) : spec.export.width / 2;
  const cy = dashboard ? (tall ? spec.export.height * 0.45 : spec.export.height * 0.57) : spec.export.height / 2 + 22;
  const radius = Math.min(spec.export.width, spec.export.height) * (dashboard ? (tall ? 0.26 : 0.2) : 0.25);
  const strokeWidth = Math.max(dashboard ? 22 : 22, radius * (tall ? 0.18 : 0.22));
  const circumference = 2 * Math.PI * radius;
  let offset = 0;

  const track = circle({
    cx,
    cy,
    r: Number(radius.toFixed(2)),
    fill: "none",
    stroke: dashboard ? "#edf2f7" : theme.border,
    "stroke-width": Number(strokeWidth.toFixed(2)),
    opacity: dashboard ? 1 : 0.62
  });

  const arcs = points
    .map((point, index) => {
      const part = Math.max(0, point.value) / total;
      const dash = part > 0.985 ? circumference : Math.max(0.1, circumference * part - 4);
      const gap = circumference - dash;
      const currentOffset = -offset;
      offset += circumference * part;
      const delay = stagger(index, spec.motion.delayMs, spec.motion.staggerMs);
      return circle(
        {
          cx,
          cy,
          r: Number(radius.toFixed(2)),
          fill: "none",
          stroke: theme.palette[index % theme.palette.length],
          "stroke-width": Number(strokeWidth.toFixed(2)),
          "stroke-linecap": "round",
          "stroke-dasharray": `${dash.toFixed(2)} ${gap.toFixed(2)}`,
          "stroke-dashoffset": Number((currentOffset + dash).toFixed(2)),
          transform: `rotate(-90 ${cx} ${cy})`
        },
        animate(
          "stroke-dashoffset",
          Number((currentOffset + dash).toFixed(2)),
          Number(currentOffset.toFixed(2)),
          spec.motion.durationMs,
          delay,
          spec.motion
        )
      );
    })
    .join("");

  const legend = dashboard
    ? tall
      ? renderDashboardLegendGrid(spec, theme, points, total, spec.export.height * 0.68)
      : renderDashboardVerticalLegend(spec, theme, points, total, 176)
    : renderHorizontalWrapLegend(spec, theme, points);

  return group(
    track +
      arcs +
      textNode(formatNumber(total), {
        x: cx,
        y: cy + 5,
        fill: theme.text,
        "font-size": dashboard ? (tall ? 30 : 26) : theme.typography.value,
        "font-family": DASHBOARD_FONT,
        "font-weight": 620,
        "text-anchor": "middle"
      }) +
      textNode("合计", {
        x: cx,
        y: cy + (tall ? 34 : 32),
        fill: "#7b8496",
        "font-size": dashboard ? 12 : theme.typography.label,
        "font-family": DASHBOARD_FONT,
        "text-anchor": "middle"
      }) +
      legend
  );
}

function renderPieChart(spec: VisualSpec, theme: VisualTheme, points: ReturnType<typeof extractAggregatedPoints>, total: number): string {
  const tall = spec.export.height / spec.export.width > 1.15;
  const cx = tall ? spec.export.width / 2 : spec.export.width * 0.38;
  const cy = tall ? spec.export.height * 0.44 : spec.export.height * 0.57;
  const radius = Math.min(spec.export.width, spec.export.height) * (tall ? 0.28 : 0.23);
  let angle = -90;

  const slices = points
    .map((point, index) => {
      const part = Math.max(0, point.value) / total;
      const start = angle;
      const end = angle + part * 360;
      angle = end;
      const delay = stagger(index, spec.motion.delayMs, Math.max(36, spec.motion.staggerMs));
      return path(
        {
          d: pieSlicePath(cx, cy, radius, start, end),
          fill: theme.palette[index % theme.palette.length],
          opacity: 1,
          stroke: theme.surface,
          "stroke-width": 3
        },
        animate("opacity", 0, 1, 320, delay, { easing: "ease-out" })
      );
    })
    .join("");

  return group(slices + (tall ? renderDashboardLegendGrid(spec, theme, points, total, spec.export.height * 0.68) : renderPartLegend(spec, theme, points, total)));
}

function renderDashboardVerticalLegend(
  spec: VisualSpec,
  theme: VisualTheme,
  points: ReturnType<typeof extractAggregatedPoints>,
  total: number,
  startY: number
): string {
  const available = Math.max(96, spec.export.height - startY - 58);
  const rowGap = Math.max(24, Math.min(38, available / Math.max(1, Math.min(points.length, 10))));
  const maxRows = Math.max(3, Math.min(10, Math.floor(available / rowGap)));
  const visible = points.slice(0, maxRows);
  const x = spec.export.width * 0.62;
  const rows = visible
    .map((point, index) => {
      const color = theme.palette[index % theme.palette.length];
      const positiveValue = Math.max(0, point.value);
      const percent = `${((positiveValue / total) * 100).toFixed(positiveValue === total ? 0 : 1)}%`;
      const y = startY + index * rowGap;
      return group(
        circle({ cx: x, cy: y - 5, r: 5.5, fill: color }) +
          textNode(point.label.slice(0, 9), {
            x: x + 12,
            y,
            fill: theme.text,
            "font-size": 14,
            "font-family": DASHBOARD_FONT,
            "font-weight": 580
          }) +
          textNode(formatNumber(positiveValue), {
            x: spec.export.width - 106,
            y,
            fill: "#697386",
            "font-size": 13,
            "font-family": DASHBOARD_FONT,
            "text-anchor": "end"
          }) +
          textNode(percent, {
            x: spec.export.width - 54,
            y,
            fill: "#7b8496",
            "font-size": 13,
            "font-family": DASHBOARD_FONT,
            "text-anchor": "end"
          })
      );
    })
    .join("");

  const overflow = points.length - visible.length;
  const overflowNode =
    overflow > 0
      ? textNode(`其余 ${overflow} 项`, {
          x,
          y: startY + visible.length * rowGap,
          fill: theme.muted,
          "font-size": 13,
          "font-family": DASHBOARD_FONT,
          "font-weight": 560
        })
      : "";

  return rows + overflowNode;
}

function renderDashboardLegendGrid(
  spec: VisualSpec,
  theme: VisualTheme,
  points: ReturnType<typeof extractAggregatedPoints>,
  total: number,
  startY: number
): string {
  const visible = points.slice(0, 8);
  const left = 86;
  const colGap = 48;
  const colWidth = (spec.export.width - left * 2 - colGap) / 2;
  const rowGap = 48;
  const rows = visible
    .map((point, index) => {
      const color = theme.palette[index % theme.palette.length];
      const col = index % 2;
      const row = Math.floor(index / 2);
      const x = left + col * (colWidth + colGap);
      const y = startY + row * rowGap;
      const positiveValue = Math.max(0, point.value);
      const percent = `${((positiveValue / total) * 100).toFixed(positiveValue === total ? 0 : 1)}%`;
      return group(
        circle({ cx: x, cy: y - 5, r: 6, fill: color }) +
          textNode(point.label.slice(0, 8), {
            x: x + 16,
            y,
            fill: "#2f3747",
            "font-size": 15,
            "font-family": DASHBOARD_FONT,
            "font-weight": 620
          }) +
          textNode(percent, {
            x: x + colWidth - 8,
            y,
            fill: "#7b8496",
            "font-size": 14,
            "font-family": DASHBOARD_FONT,
            "font-weight": 560,
            "text-anchor": "end"
          })
      );
    })
    .join("");

  const overflow = points.length - visible.length;
  const overflowNode =
    overflow > 0
      ? textNode(`其余 ${overflow} 项`, {
          x: left,
          y: startY + Math.ceil(visible.length / 2) * rowGap + 6,
          fill: "#7b8496",
          "font-size": 12,
          "font-family": DASHBOARD_FONT
        })
      : "";

  return rows + overflowNode;
}

function renderHorizontalWrapLegend(spec: VisualSpec, theme: VisualTheme, points: ReturnType<typeof extractAggregatedPoints>): string {
  const itemWidth = 138;
  const startX = 70;
  const startY = spec.export.height - 92;
  const perRow = Math.max(1, Math.floor((spec.export.width - startX * 2) / itemWidth));
  const maxItems = Math.min(points.length, perRow * 2);
  const visible = points.slice(0, maxItems);
  const rows = visible
    .map((point, index) => {
      const color = theme.palette[index % theme.palette.length];
      const col = index % perRow;
      const row = Math.floor(index / perRow);
      const x = startX + col * itemWidth;
      const y = startY + row * 24;
      return group(
        circle({ cx: x, cy: y - 4, r: 5, fill: color }) +
          textNode(point.label.slice(0, 14), {
            x: x + 12,
            y,
            fill: theme.muted,
            "font-size": theme.typography.label,
            "font-family": DASHBOARD_FONT
          })
      );
    })
    .join("");

  const overflow = points.length - visible.length;
  return (
    rows +
    (overflow > 0
      ? textNode(`+${overflow}`, {
          x: startX + (visible.length % perRow) * itemWidth,
          y: startY + Math.floor(visible.length / perRow) * 24,
          fill: theme.muted,
          "font-size": theme.typography.label,
          "font-family": DASHBOARD_FONT,
          "font-weight": 700
        })
      : "")
  );
}

function renderArcBands(spec: VisualSpec, theme: VisualTheme, points: ReturnType<typeof extractAggregatedPoints>): string {
  const cx = spec.export.width / 2;
  const cy = spec.export.height * 0.46;
  const max = maxAbs(points);
  const topPoints = points.slice(0, 6);
  const total = totalPositive(topPoints);
  const leader = topPoints[0];
  const bands = topPoints
    .map((point, index) => {
      const radius = 252 - index * 25;
      const part = Math.max(0.04, Math.min(1, Math.max(0, point.value) / max));
      const end = -116 + 232 * part;
      const delay = stagger(index, spec.motion.delayMs, Math.max(36, spec.motion.staggerMs));
      return (
        path({
          d: describeArc(cx, cy, radius, -116, 116),
          fill: "none",
          stroke: "#eef2f7",
          "stroke-width": 16,
          "stroke-linecap": "round"
        }) +
        path(
          {
            d: describeArc(cx, cy, radius, -116, end),
            fill: "none",
            stroke: theme.palette[index % theme.palette.length],
            "stroke-width": 16,
            "stroke-linecap": "round",
            opacity: 1
          },
          animate("opacity", 0, 1, 320, delay, { easing: "ease-out" })
        )
      );
    })
    .join("");

  const labels = topPoints
    .map((point, index) => {
      const col = index % 2;
      const row = Math.floor(index / 2);
      const left = 70;
      const colGap = 42;
      const colWidth = (spec.export.width - left * 2 - colGap) / 2;
      const x = left + col * (colWidth + colGap);
      const y = 744 + row * 52;
      const color = theme.palette[index % theme.palette.length];
      const percent = `${((Math.max(0, point.value) / total) * 100).toFixed(1)}%`;
      return group(
        circle({ cx: x, cy: y - 6, r: 6.5, fill: color }) +
          textNode(point.label.slice(0, 9), {
            x: x + 18,
            y,
            fill: theme.text,
            "font-size": 15,
            "font-family": DASHBOARD_FONT,
            "font-weight": 640
          }) +
          textNode(formatNumber(point.value), {
            x: x + colWidth - 74,
            y,
            fill: "#697386",
            "font-size": 14,
            "font-family": DASHBOARD_FONT,
            "text-anchor": "end"
          }) +
          textNode(percent, {
            x: x + colWidth - 6,
            y,
            fill: "#7b8496",
            "font-size": 13,
            "font-family": DASHBOARD_FONT,
            "font-weight": 560,
            "text-anchor": "end"
          })
      );
    })
    .join("");

  const leaderSummary = leader
    ? textNode(leader.label.slice(0, 10), {
        x: cx,
        y: cy - 10,
        fill: "#7b8496",
        "font-size": 14,
        "font-family": DASHBOARD_FONT,
        "font-weight": 560,
        "text-anchor": "middle"
      }) +
      textNode(formatNumber(leader.value), {
        x: cx,
        y: cy + 34,
        fill: theme.text,
        "font-size": 42,
        "font-family": DASHBOARD_FONT,
        "font-weight": 780,
        "text-anchor": "middle"
      })
    : "";

  return group(bands + leaderSummary + labels);
}

function renderGauge(spec: VisualSpec, theme: VisualTheme, total: number): string {
  const cx = spec.export.width / 2;
  const cy = spec.export.height * 0.55;
  const radius = Math.min(spec.export.width, spec.export.height) * 0.29;
  const target = Math.max(100, Math.ceil(total / 100) * 100);
  const percent = Math.min(0.98, total / target);
  const end = -120 + 240 * percent;

  return group(
    path({
      d: describeArc(cx, cy, radius, -120, 120),
      fill: "none",
      stroke: "#eef2f7",
      "stroke-width": 28,
      "stroke-linecap": "round"
    }) +
      path(
        {
          d: describeArc(cx, cy, radius, -120, end),
          fill: "none",
          stroke: theme.accent,
          "stroke-width": 28,
          "stroke-linecap": "round",
          opacity: 1
        },
        animate("opacity", 0, 1, 420, spec.motion.delayMs + 80, { easing: "ease-out" })
      ) +
      textNode(`${Math.round(percent * 100)}%`, {
        x: cx,
        y: cy - 8,
        fill: theme.text,
        "font-size": 44,
        "font-family": DASHBOARD_FONT,
        "font-weight": 780,
        "text-anchor": "middle"
      }) +
      textNode(`${formatNumber(total)} / ${formatNumber(target)}`, {
        x: cx,
        y: cy + 30,
        fill: "#697386",
        "font-size": 15,
        "font-family": DASHBOARD_FONT,
        "text-anchor": "middle"
      }) +
      textNode("完成进度", {
        x: 72,
        y: 212,
        fill: theme.text,
        "font-size": 18,
        "font-family": DASHBOARD_FONT,
        "font-weight": 680
      }) +
      textNode("按当前数据合计自动换算目标区间", {
        x: 72,
        y: 242,
        fill: "#7b8496",
        "font-size": 14,
        "font-family": DASHBOARD_FONT
      })
  );
}

function renderPartLegend(spec: VisualSpec, theme: VisualTheme, points: ReturnType<typeof extractAggregatedPoints>, total: number): string {
  return renderDashboardVerticalLegend(spec, theme, points, total, 176);
}

function pieSlicePath(cx: number, cy: number, radius: number, startAngle: number, endAngle: number): string {
  const start = polar(cx, cy, radius, startAngle);
  const end = polar(cx, cy, radius, endAngle);
  const largeArc = endAngle - startAngle > 180 ? 1 : 0;
  return `M ${cx.toFixed(2)} ${cy.toFixed(2)} L ${start.x.toFixed(2)} ${start.y.toFixed(2)} A ${radius.toFixed(2)} ${radius.toFixed(2)} 0 ${largeArc} 1 ${end.x.toFixed(2)} ${end.y.toFixed(2)} Z`;
}

function polar(cx: number, cy: number, radius: number, angle: number) {
  const radians = (angle * Math.PI) / 180;
  return {
    x: cx + radius * Math.cos(radians),
    y: cy + radius * Math.sin(radians)
  };
}
