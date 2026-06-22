import { baseDefs } from "@/lib/motion/svgGradients";
import { chartFrame } from "@/lib/motion/renderUtils";
import { renderAnimatedBar } from "@/lib/motion/renderAnimatedBar";
import { renderAnimatedHorizontalBar } from "@/lib/motion/renderAnimatedHorizontalBar";
import { renderAreaTrend } from "@/lib/motion/renderAreaTrend";
import { renderDonutSweep } from "@/lib/motion/renderDonutSweep";
import { renderHeatmap } from "@/lib/motion/renderHeatmap";
import { renderLineDraw } from "@/lib/motion/renderLineDraw";
import { renderMetricCard } from "@/lib/motion/renderMetricCard";
import { renderNetwork } from "@/lib/motion/renderNetwork";
import { renderRadar } from "@/lib/motion/renderRadar";
import { renderRoseBloom } from "@/lib/motion/renderRoseBloom";
import { renderSankey } from "@/lib/motion/renderSankey";
import { renderScatterBubble } from "@/lib/motion/renderScatterBubble";
import { renderTreemap } from "@/lib/motion/renderTreemap";
import { animate, circle, group, rect, svgRoot, textNode } from "@/lib/motion/svgPrimitives";
import { cardTitle, footerText } from "@/lib/motion/svgText";
import { validateWechatSvg, type WeChatCompatibilityResult } from "@/lib/wechat/validateWechatSvg";
import { resolvePaletteForSpec, resolveVisualItemCount } from "@/lib/visual/autoPalette";
import { getTheme, type VisualTheme } from "@/lib/visual/themes";
import { VisualSpecSchema, type VisualSpec, type VisualType } from "@/lib/visual/visualSpec";

export type AnimatedSvgRenderResult = {
  svg: string;
  warnings: string[];
  compatibility: WeChatCompatibilityResult;
  palette: string[];
};

const LIMITS: Partial<Record<VisualType, number>> = {
  bar: 200,
  "horizontal-bar": 200,
  donut: 200,
  pie: 200,
  arc: 200,
  rose: 200,
  line: 200,
  area: 200,
  "metric-card": 200,
  scatter: 200,
  bubble: 200,
  heatmap: 400,
  treemap: 200,
  radar: 200,
  sankey: 200,
  network: 200
};
const AGGREGATED_LIMIT_TYPES: VisualType[] = ["donut", "pie", "arc", "rose", "gauge", "treemap"];

function limitWarnings(spec: VisualSpec): string[] {
  const warnings: string[] = [];
  const maxRows = LIMITS[spec.type] ?? 200;
  const visualItems = AGGREGATED_LIMIT_TYPES.includes(spec.type) ? resolveVisualItemCount(spec) : spec.data.rows.length;
  if (visualItems > maxRows) {
    warnings.push(`Animated SVG supports up to ${maxRows} visual items; this render uses the first safe slice after field mapping.`);
  }
  return warnings;
}

function fallbackVisual(spec: VisualSpec) {
  const theme = getTheme(spec.theme);
  const width = spec.export.width;
  const height = spec.export.height;
  const cells = Array.from({ length: 28 }, (_, index) => {
    const col = index % 7;
    const row = Math.floor(index / 7);
    return rect(
      {
        x: 96 + col * 108,
        y: 152 + row * 52,
        width: 72,
        height: 28,
        rx: 8,
        fill: theme.palette[index % theme.palette.length],
        opacity: 0
      },
      animate("opacity", 0, 0.72, 360, 80 + index * 24, { easing: "ease-out" })
    );
  }).join("");

  return group(
    cells +
      circle({ cx: width - 112, cy: height - 112, r: 52, fill: theme.accent, opacity: 0.1 }) +
      textNode(`${spec.type} preview`, {
        x: 96,
        y: height - 132,
        fill: theme.text,
        "font-size": 24,
        "font-family": "Inter, Arial, sans-serif",
        "font-weight": 760
      }) +
      textNode("Static-safe placeholder. Animated renderer can be extended without changing the API contract.", {
        x: 96,
        y: height - 102,
        fill: theme.muted,
        "font-size": 14,
        "font-family": "Inter, Arial, sans-serif"
      })
  );
}

function bodyForSpec(spec: VisualSpec): { body: string; warnings: string[] } {
  const theme = themeForSpec(spec);
  switch (spec.type) {
    case "bar":
    case "grouped-bar":
    case "stacked-bar":
    case "waterfall":
      return { body: renderAnimatedBar(spec, theme), warnings: [] };
    case "ranking":
      return { body: renderAnimatedHorizontalBar(spec, theme), warnings: [] };
    case "horizontal-bar":
      return { body: renderAnimatedHorizontalBar(spec, theme), warnings: [] };
    case "bar-race":
      return { body: renderAnimatedHorizontalBar(spec, theme), warnings: ["bar-race currently renders as a horizontal growth preview without time slider."] };
    case "donut":
    case "pie":
    case "arc":
    case "gauge":
      return { body: renderDonutSweep(spec, theme), warnings: [] };
    case "area":
      return { body: renderAreaTrend(spec, theme), warnings: [] };
    case "line":
    case "timeline":
    case "slope":
    case "bump":
    case "line-race":
      return { body: renderLineDraw(spec, theme), warnings: [] };
    case "metric-card":
      return { body: renderMetricCard(spec, theme), warnings: [] };
    case "rose":
      return { body: renderRoseBloom(spec, theme), warnings: [] };
    case "scatter":
    case "bubble":
      return { body: renderScatterBubble(spec, theme), warnings: [] };
    case "heatmap":
      return { body: renderHeatmap(spec, theme), warnings: [] };
    case "treemap":
      return { body: renderTreemap(spec, theme), warnings: [] };
    case "radar":
      return { body: renderRadar(spec, theme), warnings: [] };
    case "sankey":
      return { body: renderSankey(spec, theme), warnings: [] };
    case "network":
      return { body: renderNetwork(spec, theme), warnings: [] };
    default:
      return { body: fallbackVisual(spec), warnings: [`${spec.type} is rendered as a safe static placeholder in this build.`] };
  }
}

export function renderAnimatedSvg(input: VisualSpec): AnimatedSvgRenderResult {
  const parsed = VisualSpecSchema.safeParse(input);
  if (!parsed.success) {
    throw new Error(parsed.error.issues.map((issue) => issue.message).join("; "));
  }

  const spec = parsed.data;
  const theme = themeForSpec(spec);
  const warnings = limitWarnings(spec);
  const body = bodyForSpec(spec);
  warnings.push(...body.warnings);

  const children =
    baseDefs(theme) +
    chartFrame(spec.export.width, spec.export.height, theme) +
    cardTitle(spec.title, spec.subtitle, theme) +
    body.body +
    footerText(spec.caption ?? spec.insight, spec.source, theme, spec.export.height);

  const svg = svgRoot({
    width: spec.export.width,
    height: spec.export.height,
    background: theme.background,
    children
  });

  return {
    svg,
    warnings,
    compatibility: validateWechatSvg(svg),
    palette: theme.palette
  };
}

function themeForSpec(spec: VisualSpec): VisualTheme {
  const theme = getTheme(spec.theme);
  const palette = resolvePaletteForSpec(spec, theme);

  return {
    ...theme,
    accent: palette[0] ?? theme.accent,
    palette
  };
}
