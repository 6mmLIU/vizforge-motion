import { z } from "zod";

export const VISUAL_TYPES = [
  "line",
  "area",
  "bar",
  "horizontal-bar",
  "stacked-bar",
  "grouped-bar",
  "pie",
  "donut",
  "arc",
  "rose",
  "scatter",
  "bubble",
  "heatmap",
  "treemap",
  "radar",
  "gauge",
  "metric-card",
  "ranking",
  "bar-race",
  "line-race",
  "slope",
  "bump",
  "waterfall",
  "sankey",
  "network",
  "timeline"
] as const;

export const VISUAL_STORIES = [
  "change-over-time",
  "magnitude",
  "part-to-whole",
  "ranking",
  "correlation",
  "distribution",
  "flow",
  "spatial",
  "deviation",
  "single-metric"
] as const;

export const THEME_IDS = [
  "aurora-dark",
  "cyber-neon",
  "glass-finance",
  "editorial-light",
  "minimal-ink",
  "warm-paper",
  "ocean-gradient",
  "violet-pulse"
] as const;

export const MOTION_PRESETS = [
  "none",
  "grow",
  "sweep",
  "draw",
  "fade-up",
  "bloom",
  "count-up"
] as const;

export const EXPORT_FORMATS = [
  "animated-svg",
  "static-svg",
  "png",
  "webp",
  "jpeg",
  "json"
] as const;

export type VisualType = (typeof VISUAL_TYPES)[number];
export type VisualStory = (typeof VISUAL_STORIES)[number];
export type ThemeId = (typeof THEME_IDS)[number];
export type MotionPreset = (typeof MOTION_PRESETS)[number];
export type ExportFormat = (typeof EXPORT_FORMATS)[number];
export type ColumnType = "number" | "date" | "category" | "string" | "boolean" | "unknown";

export type DataRow = Record<string, string | number | boolean | null>;

export type CardMetric = {
  label: string;
  value: string | number;
  delta?: string | number;
  trend?: "up" | "down" | "neutral";
  prefix?: string;
  suffix?: string;
};

export type CardSpec = {
  periodLabel?: string;
  metrics?: CardMetric[];
};

export type ColumnSchema = {
  name: string;
  type: ColumnType;
  nullable: boolean;
  uniqueCount: number;
  examples: Array<string | number | boolean>;
};

export type ParsedDataset = {
  rows: DataRow[];
  columns: ColumnSchema[];
  warnings: string[];
};

export type MotionSpec = {
  preset: MotionPreset;
  durationMs: number;
  delayMs: number;
  staggerMs: number;
  easing: "linear" | "ease-out" | "ease-in-out" | "cinematic";
};

export type ExportSpec = {
  format: ExportFormat;
  wechatSafeMode: boolean;
  width: number;
  height: number;
};

export type FieldMapping = {
  category?: string;
  value?: string;
  x?: string;
  y?: string;
  series?: string;
  source?: string;
  target?: string;
};

export type VisualSpec = {
  title: string;
  subtitle?: string;
  insight?: string;
  caption?: string;
  source?: string;
  card?: CardSpec;
  palette?: string[];
  type: VisualType;
  story: VisualStory;
  theme: ThemeId;
  data: {
    rows: DataRow[];
  };
  mappings?: FieldMapping;
  motion: MotionSpec;
  export: ExportSpec;
};

export const DataValueSchema = z.union([z.string(), z.number(), z.boolean(), z.null()]);

export const DataRowSchema = z.record(DataValueSchema);

function blankToUndefined(value: unknown) {
  return typeof value === "string" && value.trim() === "" ? undefined : value;
}

const OptionalText = (max: number) => z.preprocess(blankToUndefined, z.string().trim().min(1).max(max).optional());
const OptionalMetricValue = z.preprocess(blankToUndefined, z.union([z.string().trim().min(1).max(80), z.number()]).optional());
const OptionalMetricDelta = z.preprocess(blankToUndefined, z.union([z.string().trim().min(1).max(40), z.number()]).optional());
const OptionalTrend = z.preprocess(blankToUndefined, z.enum(["up", "down", "neutral"]).optional());

export const CardMetricSchema = z.object({
  label: z.string().trim().min(1).max(80),
  value: z.union([z.string().trim().min(1).max(80), z.number()]),
  delta: OptionalMetricDelta,
  trend: OptionalTrend,
  prefix: OptionalText(16),
  suffix: OptionalText(16)
});

const AdaptiveCardMetricSchema = z
  .object({
    label: OptionalText(80),
    value: OptionalMetricValue,
    delta: OptionalMetricDelta,
    trend: OptionalTrend,
    prefix: OptionalText(16),
    suffix: OptionalText(16)
  })
  .transform((metric): CardMetric | null => {
    if (!metric.label || metric.value === undefined) return null;
    return {
      label: metric.label,
      value: metric.value,
      ...(metric.delta !== undefined ? { delta: metric.delta } : {}),
      ...(metric.trend ? { trend: metric.trend } : {}),
      ...(metric.prefix ? { prefix: metric.prefix } : {}),
      ...(metric.suffix ? { suffix: metric.suffix } : {})
    };
  });

export const CardSpecSchema = z
  .object({
    periodLabel: OptionalText(80),
    metrics: z.array(AdaptiveCardMetricSchema).max(4).optional()
  })
  .transform((card): CardSpec => {
    const metrics = card.metrics?.filter((metric): metric is CardMetric => metric !== null);
    return {
      ...(card.periodLabel ? { periodLabel: card.periodLabel } : {}),
      ...(metrics?.length ? { metrics } : {})
    };
  });

const HexColorSchema = z.string().regex(/^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/, "Must be a hex color like #0a84ff.");

export const MotionSpecSchema = z.object({
  preset: z.enum(MOTION_PRESETS).default("grow"),
  durationMs: z.number().int().min(120).max(10000).default(1400),
  delayMs: z.number().int().min(0).max(10000).default(0),
  staggerMs: z.number().int().min(0).max(2000).default(80),
  easing: z.enum(["linear", "ease-out", "ease-in-out", "cinematic"]).default("cinematic")
});

export const ExportSpecSchema = z.object({
  format: z.enum(EXPORT_FORMATS).default("animated-svg"),
  wechatSafeMode: z.boolean().default(true),
  width: z.number().int().min(320).max(2400).default(720),
  height: z.number().int().min(240).max(1800).default(500)
});

export const FieldMappingSchema = z
  .object({
    category: z.string().optional(),
    value: z.string().optional(),
    x: z.string().optional(),
    y: z.string().optional(),
    series: z.string().optional(),
    source: z.string().optional(),
    target: z.string().optional()
  })
  .partial();

export const VisualSpecSchema = z.object({
  title: z.string().trim().min(1).max(140),
  subtitle: z.string().trim().max(220).optional(),
  insight: z.string().trim().max(180).optional(),
  caption: z.string().trim().max(220).optional(),
  source: z.string().trim().max(140).optional(),
  card: CardSpecSchema.optional(),
  palette: z.array(HexColorSchema).min(1).max(500).optional(),
  type: z.enum(VISUAL_TYPES),
  story: z.enum(VISUAL_STORIES),
  theme: z.enum(THEME_IDS).default("aurora-dark"),
  data: z.object({
    rows: z.array(DataRowSchema).min(1).max(5000)
  }),
  mappings: FieldMappingSchema.optional(),
  motion: MotionSpecSchema.default({
    preset: "grow",
    durationMs: 1400,
    delayMs: 0,
    staggerMs: 80,
    easing: "cinematic"
  }),
  export: ExportSpecSchema.default({
    format: "animated-svg",
    wechatSafeMode: true,
    width: 720,
    height: 500
  })
});

export function defaultMotionForType(type: VisualType): MotionSpec {
  const presetByType: Record<VisualType, MotionPreset> = {
    line: "draw",
    area: "draw",
    bar: "grow",
    "horizontal-bar": "grow",
    "stacked-bar": "grow",
    "grouped-bar": "grow",
    pie: "sweep",
    donut: "sweep",
    arc: "sweep",
    rose: "bloom",
    scatter: "fade-up",
    bubble: "fade-up",
    heatmap: "fade-up",
    treemap: "fade-up",
    radar: "draw",
    gauge: "sweep",
    "metric-card": "count-up",
    ranking: "grow",
    "bar-race": "grow",
    "line-race": "draw",
    slope: "draw",
    bump: "draw",
    waterfall: "grow",
    sankey: "fade-up",
    network: "fade-up",
    timeline: "draw"
  };

  return {
    preset: presetByType[type],
    durationMs: 1400,
    delayMs: 0,
    staggerMs: 80,
    easing: "cinematic"
  };
}

export const DEFAULT_SAMPLE_ROWS: DataRow[] = [
  { channel: "自然流量", value: 29, month: "2026-01" },
  { channel: "付费广告", value: 52, month: "2026-02" },
  { channel: "公众号", value: 34, month: "2026-03" },
  { channel: "小红书", value: 16, month: "2026-04" },
  { channel: "自然流量", value: 43, month: "2026-05" },
  { channel: "付费广告", value: 23, month: "2026-06" },
  { channel: "公众号", value: 25, month: "2026-07" },
  { channel: "小红书", value: 30, month: "2026-08" },
  { channel: "自然流量", value: 10, month: "2026-09" },
  { channel: "付费广告", value: 43, month: "2026-10" },
  { channel: "公众号", value: 37, month: "2026-11" },
  { channel: "小红书", value: 31, month: "2026-12" }
];

export const DEFAULT_VISUAL_SPEC: VisualSpec = {
  title: "销售表现",
  subtitle: "最近周期销售数据",
  insight: "自然流量贡献了主要增长。",
  caption: "粘贴数据，选择图形，导出微信公众号可用的动画 SVG。",
  source: "示例数据",
  card: {
    periodLabel: "最近 2 周",
    metrics: [
      { label: "周销售额", value: "28,441", prefix: "$", delta: "3.3%", trend: "up" },
      { label: "日销售额", value: "4,063", prefix: "$", delta: "3.3%", trend: "up" },
      { label: "总销量", value: 278, delta: "3.3%", trend: "up" }
    ]
  },
  type: "bar",
  story: "magnitude",
  theme: "editorial-light",
  data: { rows: DEFAULT_SAMPLE_ROWS },
  mappings: {
    category: "month",
    value: "value",
    x: "month",
    y: "value",
    series: "channel"
  },
  motion: defaultMotionForType("bar"),
  export: {
    format: "animated-svg",
    wechatSafeMode: true,
    width: 720,
    height: 500
  }
};
