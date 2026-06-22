import { baseDefs } from "@/lib/motion/svgGradients";
import { footer, frame, geom, header, type Geom } from "@/lib/motion/layout";
import { renderBar, renderStackedBar } from "@/lib/motion/renderAnimatedBar";
import { renderHorizontalBar } from "@/lib/motion/renderAnimatedHorizontalBar";
import { renderArea } from "@/lib/motion/renderAreaTrend";
import { renderDonut } from "@/lib/motion/renderDonutSweep";
import { renderHeatmap } from "@/lib/motion/renderHeatmap";
import { renderLine } from "@/lib/motion/renderLineDraw";
import { renderMetricCard } from "@/lib/motion/renderMetricCard";
import { renderRose } from "@/lib/motion/renderRoseBloom";
import { renderScatter } from "@/lib/motion/renderScatterBubble";
import { renderTreemap } from "@/lib/motion/renderTreemap";
import { svgRoot } from "@/lib/motion/svgPrimitives";
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

type RenderCanvas = {
  physicalWidth: number;
  physicalHeight: number;
  logicalWidth: number;
  logicalHeight: number;
};

const LIMITS: Partial<Record<VisualType, number>> = {
  bar: 200,
  "horizontal-bar": 200,
  "stacked-bar": 200,
  donut: 200,
  pie: 200,
  rose: 200,
  line: 200,
  area: 200,
  "metric-card": 200,
  scatter: 200,
  bubble: 200,
  heatmap: 400,
  treemap: 200
};
const AGGREGATED_LIMIT_TYPES: VisualType[] = ["donut", "pie", "rose", "treemap"];

function limitWarnings(spec: VisualSpec): string[] {
  const warnings: string[] = [];
  const maxRows = LIMITS[spec.type] ?? 200;
  const visualItems = AGGREGATED_LIMIT_TYPES.includes(spec.type) ? resolveVisualItemCount(spec) : spec.data.rows.length;
  if (visualItems > maxRows) {
    warnings.push(`当前类型最多渲染 ${maxRows} 个可视项，超出部分已按安全切片处理。`);
  }
  return warnings;
}

function bodyForSpec(spec: VisualSpec, theme: VisualTheme, g: Geom): string {
  switch (spec.type) {
    case "bar":
      return renderBar(spec, theme, g);
    case "stacked-bar":
      return renderStackedBar(spec, theme, g);
    case "horizontal-bar":
      return renderHorizontalBar(spec, theme, g);
    case "line":
      return renderLine(spec, theme, g);
    case "area":
      return renderArea(spec, theme, g);
    case "donut":
    case "pie":
      return renderDonut(spec, theme, g);
    case "rose":
      return renderRose(spec, theme, g);
    case "treemap":
      return renderTreemap(spec, theme, g);
    case "scatter":
    case "bubble":
      return renderScatter(spec, theme, g);
    case "heatmap":
      return renderHeatmap(spec, theme, g);
    case "metric-card":
      return renderMetricCard(spec, theme, g);
    default:
      return renderBar(spec, theme, g);
  }
}

export function renderAnimatedSvg(input: VisualSpec): AnimatedSvgRenderResult {
  const parsed = VisualSpecSchema.safeParse(input);
  if (!parsed.success) {
    throw new Error(parsed.error.issues.map((issue) => issue.message).join("; "));
  }

  const spec = parsed.data;
  const canvas = resolveRenderCanvas(spec.export.width, spec.export.height);
  const renderSpec: VisualSpec = {
    ...spec,
    export: {
      ...spec.export,
      width: canvas.logicalWidth,
      height: canvas.logicalHeight
    }
  };
  const theme = themeForSpec(renderSpec);
  const g = geom(renderSpec);
  const warnings = limitWarnings(spec);

  const children =
    baseDefs(theme) +
    frame(theme, g) +
    header(renderSpec, theme, g) +
    bodyForSpec(renderSpec, theme, g) +
    footer(renderSpec, theme, g);

  const svg = svgRoot({
    width: canvas.physicalWidth,
    height: canvas.physicalHeight,
    viewBoxWidth: canvas.logicalWidth,
    viewBoxHeight: canvas.logicalHeight,
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

function resolveRenderCanvas(width: number, height: number): RenderCanvas {
  const physicalWidth = width;
  const physicalHeight = height;
  const aspect = width / height;
  const isHighResolution = width >= 1000 || height >= 900;

  if (!isHighResolution) {
    return { physicalWidth, physicalHeight, logicalWidth: width, logicalHeight: height };
  }

  let baseWidth = 760;
  let baseHeight = Math.round(baseWidth / aspect);

  if (aspect >= 2.2) {
    baseWidth = 980;
    baseHeight = Math.round(baseWidth / aspect);
  } else {
    baseHeight = Math.round(baseWidth / aspect);
  }

  const scale = Math.min(width / baseWidth, height / baseHeight);
  if (scale < 1.2) {
    return { physicalWidth, physicalHeight, logicalWidth: width, logicalHeight: height };
  }

  return {
    physicalWidth,
    physicalHeight,
    logicalWidth: Math.round(width / scale),
    logicalHeight: Math.round(height / scale)
  };
}
