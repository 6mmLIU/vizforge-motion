"use client";

import { normalizeDataset } from "@/lib/data/normalizeDataset";
import { parseCsv } from "@/lib/data/parseCsv";
import { parseJson } from "@/lib/data/parseJson";
import { parseMarkdownTable } from "@/lib/data/parseMarkdownTable";
import { renderAnimatedSvg } from "@/lib/motion/animatedSvgRenderer";
import { resolvePaletteForSpec, resolveVisualItemCount } from "@/lib/visual/autoPalette";
import { recommendVisual } from "@/lib/visual/recommendVisual";
import { THEMES } from "@/lib/visual/themes";
import {
  DEFAULT_VISUAL_SPEC,
  EXPORT_FORMATS,
  THEME_IDS,
  CardSpecSchema,
  defaultMotionForType,
  type CardSpec,
  type DataRow,
  type ExportFormat,
  type ThemeId,
  type VisualSpec,
  type VisualStory,
  type VisualType
} from "@/lib/visual/visualSpec";
import {
  ArrowLeft,
  CheckCircle2,
  Clipboard,
  Download,
  FileJson,
  LayoutDashboard,
  Palette,
  RefreshCw,
  Settings,
  ShieldCheck,
  Sparkles,
  Table2
} from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Toast, useToast } from "../_hooks/useToast";

const defaultCsv = `month,value,channel
2026-01,29,自然流量
2026-02,52,付费广告
2026-03,34,公众号
2026-04,16,小红书
2026-05,43,自然流量
2026-06,23,付费广告
2026-07,25,公众号
2026-08,30,小红书
2026-09,10,自然流量
2026-10,43,付费广告
2026-11,37,公众号
2026-12,31,小红书`;

function csvCell(value: DataRow[string] | undefined): string {
  const text = String(value ?? "");
  return /[",\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

function rowsToCsv(rows: DataRow[], columns: string[]): string {
  return [columns.join(","), ...rows.map((row) => columns.map((column) => csvCell(row[column])).join(","))].join("\n");
}

function rowsToMarkdown(rows: DataRow[], columns: string[]): string {
  return [
    `| ${columns.join(" | ")} |`,
    `| ${columns.map(() => "---").join(" | ")} |`,
    ...rows.map((row) => `| ${columns.map((column) => String(row[column] ?? "")).join(" | ")} |`)
  ].join("\n");
}

function isoDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

const dualSeriesRows: DataRow[] = [
  { month: "2026-01", channel: "自然流量", value: 29 },
  { month: "2026-02", channel: "自然流量", value: 38 },
  { month: "2026-03", channel: "自然流量", value: 33 },
  { month: "2026-04", channel: "自然流量", value: 42 },
  { month: "2026-05", channel: "自然流量", value: 41 },
  { month: "2026-06", channel: "自然流量", value: 52 },
  { month: "2026-01", channel: "付费广告", value: 14 },
  { month: "2026-02", channel: "付费广告", value: 24 },
  { month: "2026-03", channel: "付费广告", value: 18 },
  { month: "2026-04", channel: "付费广告", value: 30 },
  { month: "2026-05", channel: "付费广告", value: 27 },
  { month: "2026-06", channel: "付费广告", value: 42 }
];
const dualSeriesCsv = rowsToCsv(dualSeriesRows, ["month", "channel", "value"]);
const dualSeriesMarkdown = rowsToMarkdown(dualSeriesRows, ["month", "channel", "value"]);
const dualSeriesJson = JSON.stringify(dualSeriesRows, null, 2);

const rankingRows: DataRow[] = [
  { channel: "自然流量", value: 118 },
  { channel: "付费广告", value: 96 },
  { channel: "公众号", value: 82 },
  { channel: "小红书", value: 77 },
  { channel: "社群转化", value: 64 },
  { channel: "内容推荐", value: 58 },
  { channel: "搜索引擎", value: 43 }
];
const rankingCsv = rowsToCsv(rankingRows, ["channel", "value"]);
const rankingMarkdown = rowsToMarkdown(rankingRows, ["channel", "value"]);
const rankingJson = JSON.stringify(rankingRows, null, 2);

const dailyActivityRows: DataRow[] = Array.from({ length: 365 }, (_, index) => {
  const date = new Date(Date.UTC(2025, 6, 1 + index));
  const month = date.getUTCMonth();
  const weekday = date.getUTCDay();
  const launchWindow = month >= 3 && month <= 5 ? 24 : month >= 0 && month <= 2 ? 10 : 0;
  const weekdayLift = weekday >= 1 && weekday <= 4 ? 8 : weekday === 5 ? 4 : 0;
  const wave = Math.max(0, Math.sin(index / 8) * 10 + Math.cos(index / 19) * 8);
  const quiet = index % 17 === 0 || index % 29 === 0;
  const value = quiet ? 0 : Math.round(wave + weekdayLift + launchWindow + (index % 9));
  return { date: isoDate(date), value };
});
const dailyActivityCsv = rowsToCsv(dailyActivityRows, ["date", "value"]);
const dailyActivityMarkdown = rowsToMarkdown(dailyActivityRows, ["date", "value"]);
const dailyActivityJson = JSON.stringify(dailyActivityRows, null, 2);

const defaultJson = JSON.stringify(DEFAULT_VISUAL_SPEC.data.rows, null, 2);
const defaultMarkdown = rowsToMarkdown(DEFAULT_VISUAL_SPEC.data.rows, ["month", "value", "channel"]);
const defaultCardJson = JSON.stringify(DEFAULT_VISUAL_SPEC.card, null, 2);

const layoutSizes = {
  小红书竖卡: { width: 1080, height: 1440 },
  方形社媒: { width: 1080, height: 1080 },
  高清横卡: { width: 1440, height: 1000 },
  公众号横卡: { width: 1040, height: 720 },
  "PPT 宽图": { width: 1280, height: 720 },
  活动热力条: { width: 1280, height: 420 }
} as const;

type LayoutName = keyof typeof layoutSizes;

const IMAGE_EXPORT_PIXEL_RATIO = 2;

const palettePresets = [
  { name: "经典蓝", colors: ["#3b6ef5", "#12b3a6", "#f59e0b", "#ef5da8", "#7c5cff"] },
  { name: "内容传播", colors: ["#2f63d8", "#d84d8b", "#f06a3f", "#10b981", "#7b61ff"] },
  { name: "霓虹夜色", colors: ["#5b8cff", "#33d6c0", "#ffc24b", "#ff77b0", "#a78bfa"] },
  { name: "报告克制", colors: ["#1f2937", "#4b5563", "#2563eb", "#0ea5e9", "#64748b"] }
];

type ChartType = {
  type: VisualType;
  name: string;
  story: VisualStory;
  desc: string;
};

const chartGroups: Array<{ group: string; items: ChartType[] }> = [
  {
    group: "对比",
    items: [
      { type: "bar", name: "柱状图", story: "magnitude", desc: "分类高低对比" },
      { type: "horizontal-bar", name: "横向排行", story: "ranking", desc: "榜单排序对比" },
      { type: "stacked-bar", name: "堆叠柱状", story: "magnitude", desc: "多系列构成对比" }
    ]
  },
  {
    group: "趋势",
    items: [
      { type: "line", name: "折线趋势", story: "change-over-time", desc: "随时间变化" },
      { type: "area", name: "面积趋势", story: "change-over-time", desc: "趋势与体量" },
      { type: "heatmap", name: "活动热力图", story: "change-over-time", desc: "日历活跃度" }
    ]
  },
  {
    group: "构成",
    items: [
      { type: "donut", name: "环形占比", story: "part-to-whole", desc: "整体占比" },
      { type: "pie", name: "饼图", story: "part-to-whole", desc: "份额构成" },
      { type: "rose", name: "玫瑰图", story: "part-to-whole", desc: "传播感构成" },
      { type: "treemap", name: "矩形树图", story: "part-to-whole", desc: "层级占比" }
    ]
  },
  {
    group: "分布",
    items: [
      { type: "scatter", name: "散点图", story: "correlation", desc: "两指标相关" },
      { type: "bubble", name: "气泡图", story: "correlation", desc: "三维关系" },
      { type: "metric-card", name: "指标卡", story: "single-metric", desc: "核心 KPI" }
    ]
  }
];

const chartByType = new Map(chartGroups.flatMap((group) => group.items.map((item) => [item.type, item] as const)));

type TemplatePreset = {
  name: string;
  type: VisualType;
  title: string;
  subtitle: string;
  csv: string;
  json: string;
  markdown: string;
  cardJson: string;
  layout: LayoutName;
};

const templatePresets: TemplatePreset[] = [
  {
    name: "销售数据卡",
    type: "bar",
    title: "销售表现",
    subtitle: "最近周期销售数据，一眼看清高峰月份",
    csv: defaultCsv,
    json: defaultJson,
    markdown: defaultMarkdown,
    cardJson: defaultCardJson,
    layout: "小红书竖卡"
  },
  {
    name: "渠道排行榜",
    type: "horizontal-bar",
    title: "渠道排行",
    subtitle: "按当前数据排序的横向对比",
    csv: rankingCsv,
    json: rankingJson,
    markdown: rankingMarkdown,
    cardJson: "",
    layout: "小红书竖卡"
  },
  {
    name: "双系列趋势",
    type: "area",
    title: "访问来源趋势",
    subtitle: "自然流量与付费广告的月度走势",
    csv: dualSeriesCsv,
    json: dualSeriesJson,
    markdown: dualSeriesMarkdown,
    cardJson: "",
    layout: "高清横卡"
  },
  {
    name: "渠道占比环",
    type: "donut",
    title: "渠道占比",
    subtitle: "按渠道汇总的来源构成",
    csv: rankingCsv,
    json: rankingJson,
    markdown: rankingMarkdown,
    cardJson: "",
    layout: "小红书竖卡"
  },
  {
    name: "活动热力图",
    type: "heatmap",
    title: "活动热力图",
    subtitle: "全年每日活跃度，颜色越深越活跃",
    csv: dailyActivityCsv,
    json: dailyActivityJson,
    markdown: dailyActivityMarkdown,
    cardJson: "",
    layout: "活动热力条"
  },
  {
    name: "核心指标卡",
    type: "metric-card",
    title: "核心指标",
    subtitle: "主指标、趋势和迷你柱图都来自输入数据",
    csv: defaultCsv,
    json: defaultJson,
    markdown: defaultMarkdown,
    cardJson: defaultCardJson,
    layout: "方形社媒"
  }
];

const exportLabels: Record<ExportFormat, string> = {
  "animated-svg": "动态 SVG",
  "static-svg": "静态 SVG",
  png: "PNG",
  webp: "WebP",
  jpeg: "JPEG",
  json: "JSON assets"
};

function copy(text: string) {
  void navigator.clipboard?.writeText(text);
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function downloadSvg(svg: string) {
  downloadBlob(new Blob([svg], { type: "image/svg+xml" }), "vizforge-motion.svg");
}

function parsePaletteInput(input: string) {
  const colors = input
    .split(/[,\s]+/)
    .map((color) => color.trim())
    .filter(Boolean);
  const valid = colors.filter((color) => /^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(color));
  const warnings = colors.length !== valid.length ? ["色卡里有不是 hex 的颜色，已忽略。"] : [];
  return { colors: valid, warnings };
}

function buildSpec(params: {
  rows: DataRow[];
  card?: CardSpec;
  palette: string[];
  type: VisualType;
  story: VisualStory;
  theme: ThemeId;
  exportFormat: ExportFormat;
  layout: LayoutName;
  title: string;
  subtitle: string;
  wechatSafe: boolean;
}): VisualSpec {
  const recommendation = recommendVisual(params.rows, { type: params.type, story: params.story });
  const size = layoutSizes[params.layout];

  return {
    ...DEFAULT_VISUAL_SPEC,
    title: params.title || DEFAULT_VISUAL_SPEC.title,
    subtitle: params.subtitle || undefined,
    card: params.card,
    palette: params.palette.length ? params.palette : undefined,
    type: params.type,
    story: params.story,
    theme: params.theme,
    data: { rows: params.rows },
    mappings: recommendation.mappings,
    motion: defaultMotionForType(params.type),
    export: {
      ...DEFAULT_VISUAL_SPEC.export,
      ...size,
      format: params.exportFormat,
      wechatSafeMode: params.wechatSafe
    }
  };
}

const thumbRows = {
  comparison: [
    { label: "一月", value: 32 },
    { label: "二月", value: 48 },
    { label: "三月", value: 26 },
    { label: "四月", value: 40 },
    { label: "五月", value: 52 }
  ],
  composition: [
    { channel: "自然流量", value: 42 },
    { channel: "付费广告", value: 31 },
    { channel: "公众号", value: 24 },
    { channel: "小红书", value: 18 }
  ],
  trend: [
    { month: "2026-01", value: 18 },
    { month: "2026-02", value: 34 },
    { month: "2026-03", value: 27 },
    { month: "2026-04", value: 44 },
    { month: "2026-05", value: 38 },
    { month: "2026-06", value: 52 }
  ],
  scatter: [
    { x: 12, y: 9, channel: "A" },
    { x: 24, y: 20, channel: "B" },
    { x: 36, y: 14, channel: "C" },
    { x: 48, y: 31, channel: "D" },
    { x: 30, y: 24, channel: "E" }
  ],
  heatmap: Array.from({ length: 84 }, (_, index) => {
    const date = new Date(Date.UTC(2026, 0, 1 + index));
    return { date: isoDate(date), value: (index % 13) + (index % 4 === 0 ? 0 : 4) };
  })
} satisfies Record<string, DataRow[]>;

function thumbSvg(item: ChartType, theme: ThemeId, palette: string[]): string {
  let rows: DataRow[] = thumbRows.comparison;
  let mappings: VisualSpec["mappings"] = { category: "label", value: "value" };
  let card: CardSpec | undefined;
  if (item.type === "horizontal-bar" || item.type === "donut" || item.type === "pie" || item.type === "rose" || item.type === "treemap") {
    rows = thumbRows.composition;
    mappings = { category: "channel", value: "value" };
  } else if (item.type === "line" || item.type === "area" || item.type === "stacked-bar") {
    rows = thumbRows.trend;
    mappings = { x: "month", y: "value", category: "month", value: "value" };
  } else if (item.type === "heatmap") {
    rows = thumbRows.heatmap;
    mappings = { category: "date", value: "value", x: "date", y: "value" };
  } else if (item.type === "scatter" || item.type === "bubble") {
    rows = thumbRows.scatter;
    mappings = { x: "x", y: "y", value: "y", category: "channel" };
  } else if (item.type === "metric-card") {
    rows = thumbRows.trend;
    mappings = { category: "month", value: "value" };
    card = { metrics: [{ label: "核心指标", value: "8,420" }] };
  }
  return renderAnimatedSvg({
    ...DEFAULT_VISUAL_SPEC,
    title: item.name,
    subtitle: undefined,
    insight: undefined,
    caption: undefined,
    source: undefined,
    card,
    type: item.type,
    story: item.story,
    theme,
    palette,
    data: { rows },
    mappings,
    motion: defaultMotionForType(item.type),
    export: { ...DEFAULT_VISUAL_SPEC.export, width: 480, height: 340 }
  }).svg;
}

function Panel({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <section className={`w-full min-w-0 overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-[0_2px_12px_rgba(0,0,0,0.04)] ${className}`}>{children}</section>;
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <label className="block text-sm font-medium text-zinc-700">
      <span className="flex items-center justify-between gap-3">
        {label}
        {hint ? <span className="text-xs font-normal text-zinc-400">{hint}</span> : null}
      </span>
      <div className="mt-2">{children}</div>
    </label>
  );
}

const inputClass = "w-full rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2.5 text-zinc-950 outline-none transition focus:border-blue-400 focus:bg-white";
const selectClass = `${inputClass} appearance-none`;

type ExportPreviewState = {
  src: string;
  status: "idle" | "loading" | "ready" | "error";
  message: string;
};

function MatchedExportPreview({ preview, fallbackSvg }: { preview: ExportPreviewState; fallbackSvg: string }) {
  if (preview.src) {
    return (
      <div className="export-card-preview">
        <img src={preview.src} alt="导出预览" />
      </div>
    );
  }
  return (
    <div className="svg-card-preview relative min-w-0 rounded-xl border border-zinc-200 bg-zinc-50 p-3">
      {preview.status === "loading" ? (
        <div className="absolute inset-0 z-10 flex items-center justify-center gap-2 rounded-xl bg-zinc-50/80 text-sm font-medium text-zinc-500 backdrop-blur-sm">
          <span className="inline-block size-3 animate-spin rounded-full border-2 border-zinc-300 border-t-blue-500" />
          正在同步导出预览...
        </div>
      ) : null}
      {preview.status === "error" ? <div className="py-4 text-center text-sm font-medium text-amber-700">{preview.message}</div> : null}
      <div className={preview.status === "loading" ? "opacity-40 transition-opacity duration-200" : "transition-opacity duration-200"} dangerouslySetInnerHTML={{ __html: fallbackSvg }} />
    </div>
  );
}

export default function EditorPage() {
  const [inputMode, setInputMode] = useState<"csv" | "json" | "markdown">("csv");
  const [csv, setCsv] = useState(defaultCsv);
  const [json, setJson] = useState(defaultJson);
  const [markdown, setMarkdown] = useState(defaultMarkdown);
  const [cardJson, setCardJson] = useState(defaultCardJson);
  const [paletteText, setPaletteText] = useState(palettePresets[0].colors.join(", "));
  const [type, setType] = useState<VisualType>("bar");
  const [story, setStory] = useState<VisualStory>("magnitude");
  const [theme, setTheme] = useState<ThemeId>("light");
  const [layout, setLayout] = useState<LayoutName>("小红书竖卡");
  const [exportFormat, setExportFormat] = useState<ExportFormat>("animated-svg");
  const [wechatSafe, setWechatSafe] = useState(true);
  const [title, setTitle] = useState("销售表现");
  const [subtitle, setSubtitle] = useState("最近周期销售数据");
  const [status, setStatus] = useState("");
  const [exportPreview, setExportPreview] = useState<ExportPreviewState>({ src: "", status: "idle", message: "" });
  const { toast, show } = useToast(2000);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const queryType = params.get("type") as VisualType | null;
    const queryStory = params.get("story") as VisualStory | null;
    const queryTitle = params.get("title");
    if (queryType && chartByType.has(queryType)) {
      const chart = chartByType.get(queryType);
      setType(queryType);
      setStory(queryStory ?? chart?.story ?? "magnitude");
      const matchingTemplate = templatePresets.find((template) => template.type === queryType);
      if (matchingTemplate) {
        setTitle(queryTitle ?? matchingTemplate.title);
        setSubtitle(matchingTemplate.subtitle);
        setCsv(matchingTemplate.csv);
        setJson(matchingTemplate.json);
        setMarkdown(matchingTemplate.markdown);
        setCardJson(matchingTemplate.cardJson);
        setLayout(matchingTemplate.layout);
      } else if (queryTitle) {
        setTitle(queryTitle);
      }
      show(`已套用：${chart?.name ?? queryType}`);
    } else if (queryTitle) {
      setTitle(queryTitle);
    }
    if (window.history.replaceState) {
      const url = new URL(window.location.href);
      url.search = "";
      window.history.replaceState({}, "", url.toString());
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const rawParsed = useMemo(() => {
    if (inputMode === "json") return parseJson(json);
    if (inputMode === "markdown") return parseMarkdownTable(markdown);
    return parseCsv(csv);
  }, [csv, inputMode, json, markdown]);

  const parsed = useMemo(() => normalizeDataset(rawParsed.rows, { animated: true }), [rawParsed.rows]);
  const palette = useMemo(() => parsePaletteInput(paletteText), [paletteText]);

  const parsedCard = useMemo(() => {
    if (!cardJson.trim()) return { card: undefined as CardSpec | undefined, warning: "" };
    try {
      const parsedCardSpec = CardSpecSchema.safeParse(JSON.parse(cardJson));
      if (!parsedCardSpec.success) {
        return { card: undefined, warning: "卡片 JSON 字段不符合 schema，KPI 和周期将不显示。" };
      }
      return { card: parsedCardSpec.data, warning: "" };
    } catch {
      return { card: undefined, warning: "卡片 JSON 不是合法 JSON，KPI 和周期将不显示。" };
    }
  }, [cardJson]);

  const parseWarnings = useMemo(
    () => [...rawParsed.warnings, ...parsed.warnings, ...palette.warnings, ...(parsedCard.warning ? [parsedCard.warning] : [])],
    [palette.warnings, parsed.warnings, parsedCard.warning, rawParsed.warnings]
  );

  const recommendation = useMemo(() => recommendVisual(parsed.rows, { type, story }), [parsed.rows, story, type]);

  const spec = useMemo(
    () =>
      buildSpec({
        rows: parsed.rows.length ? parsed.rows : DEFAULT_VISUAL_SPEC.data.rows,
        card: parsedCard.card,
        palette: palette.colors,
        type,
        story,
        theme,
        exportFormat,
        layout,
        title,
        subtitle,
        wechatSafe
      }),
    [exportFormat, layout, palette.colors, parsed.rows, parsedCard.card, story, subtitle, theme, title, type, wechatSafe]
  );

  const rendered = useMemo(() => renderAnimatedSvg(spec), [spec]);
  const visualItemCount = useMemo(() => resolveVisualItemCount(spec), [spec]);
  const resolvedPalette = useMemo(() => resolvePaletteForSpec(spec, THEMES[spec.theme]), [spec]);
  const thumbnails = useMemo(() => {
    const colors = palette.colors.length ? palette.colors : palettePresets[0].colors;
    const map = new Map<VisualType, string>();
    chartGroups.forEach((group) => group.items.forEach((item) => map.set(item.type, thumbSvg(item, theme, colors))));
    return map;
  }, [palette.colors, theme]);
  const apiRequest = JSON.stringify(spec, null, 2);

  useEffect(() => {
    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      setExportPreview((current) => ({ ...current, status: "loading", message: "正在同步导出预览..." }));
      try {
        const response = await fetch("/api/v1/render", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ ...spec, export: { ...spec.export, format: "png", pixelRatio: IMAGE_EXPORT_PIXEL_RATIO } }),
          signal: controller.signal
        });
        if (!response.ok) {
          setExportPreview((current) => ({ ...current, status: "error", message: `导出预览同步失败：${response.status}` }));
          return;
        }
        const data = await response.json();
        setExportPreview({ src: data.assets?.imageDataUrl ?? "", status: "ready", message: "导出预览已同步" });
      } catch (error) {
        if (controller.signal.aborted) return;
        setExportPreview((current) => ({
          ...current,
          status: "error",
          message: error instanceof Error ? error.message : "导出预览同步失败"
        }));
      }
    }, 420);
    return () => {
      controller.abort();
      window.clearTimeout(timer);
    };
  }, [spec]);

  function currentInputValue() {
    if (inputMode === "json") return json;
    if (inputMode === "markdown") return markdown;
    return csv;
  }

  function updateCurrentInput(value: string) {
    if (inputMode === "json") setJson(value);
    else if (inputMode === "markdown") setMarkdown(value);
    else setCsv(value);
  }

  function selectChartType(item: ChartType) {
    setType(item.type);
    setStory(item.story);
  }

  function applyTemplate(template: TemplatePreset) {
    const chart = chartByType.get(template.type);
    setType(template.type);
    setStory(chart?.story ?? "magnitude");
    setTitle(template.title);
    setSubtitle(template.subtitle);
    setLayout(template.layout);
    setCsv(template.csv);
    setJson(template.json);
    setMarkdown(template.markdown);
    setCardJson(template.cardJson);
    setExportFormat("animated-svg");
    show(`已套用模板：${template.name}`);
  }

  async function downloadImage(format: "png" | "webp" | "jpeg") {
    setStatus(`正在生成 ${format.toUpperCase()}...`);
    show(`正在生成 ${format.toUpperCase()}...`);
    try {
      const response = await fetch("/api/v1/render", {
        method: "POST",
        headers: { "content-type": "application/json", accept: `image/${format}` },
        body: JSON.stringify({ ...spec, export: { ...spec.export, format, pixelRatio: IMAGE_EXPORT_PIXEL_RATIO } })
      });
      if (!response.ok) {
        setStatus(`导出失败：${response.status}`);
        show(`导出失败：${response.status}`);
        return;
      }
      downloadBlob(await response.blob(), `vizforge-motion@${IMAGE_EXPORT_PIXEL_RATIO}x.${format}`);
      setStatus(`${format.toUpperCase()} @${IMAGE_EXPORT_PIXEL_RATIO}x 已下载`);
      show(`${format.toUpperCase()} @${IMAGE_EXPORT_PIXEL_RATIO}x 已下载`);
    } catch (error) {
      const message = error instanceof Error ? error.message : "导出失败";
      setStatus(`导出失败：${message}`);
      show(`导出失败：${message}`);
    }
  }

  function copySvg() {
    copy(rendered.svg);
    show("已复制公众号 SVG");
  }

  function copyApiRequest() {
    copy(apiRequest);
    show("已复制 API 请求 JSON");
  }

  function copyColor(color: string) {
    copy(color);
    show(`已复制颜色 ${color}`);
  }

  return (
    <main className="min-h-screen overflow-x-hidden bg-[#f7f7f8] text-zinc-950">
      <header className="sticky top-0 z-40 border-b border-zinc-200 bg-[#f7f7f8]/90 backdrop-blur">
        <div className="flex h-16 items-center justify-between gap-3 px-5">
          <div className="flex min-w-0 items-center gap-3">
            <Link href="/" className="grid size-10 place-items-center rounded-full bg-zinc-100 transition hover:bg-zinc-200" aria-label="返回首页">
              <ArrowLeft className="size-4" />
            </Link>
            <div className="flex min-w-0 items-center gap-3">
              <LayoutDashboard className="size-6 shrink-0 text-blue-500" />
              <div className="min-w-0">
                <div className="truncate font-semibold">VizForge Motion 编辑器</div>
                <div className="hidden truncate text-xs text-zinc-500 sm:block">输入数据，选图，导出微信安全的动态 SVG 与高清图片。</div>
              </div>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-2 sm:gap-3">
            <div className="hidden h-10 items-center gap-2 rounded-full bg-blue-50 px-4 text-sm font-medium text-blue-700 lg:inline-flex">
              <Sparkles className="size-4" />
              {recommendation.reason}
            </div>
            <Link href="/playground" className="hidden rounded-full bg-zinc-100 px-4 py-2 text-sm font-semibold transition hover:bg-zinc-200 sm:inline-flex">
              API 调试台
            </Link>
            <div className="hidden items-center gap-2 rounded-full bg-emerald-100 px-3 py-2 text-sm font-semibold text-emerald-700 md:inline-flex">
              <ShieldCheck className="size-4" />
              微信 {rendered.compatibility.score}/100
            </div>
          </div>
        </div>
      </header>

      <div className="grid min-w-0 gap-4 p-4 sm:gap-5 sm:p-5 lg:grid-cols-[340px_minmax(0,1fr)] xl:grid-cols-[360px_minmax(0,1fr)] 2xl:grid-cols-[400px_minmax(0,1fr)_400px]">
        <Panel className="p-4">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="font-semibold">1. 输入数据</h2>
              <p className="text-sm text-zinc-500">CSV、JSON、Markdown 表格都会自动识别字段。</p>
            </div>
            <Table2 className="size-5 text-blue-500" />
          </div>

          <div className="mb-3 grid min-w-0 grid-cols-3 gap-2 overflow-hidden rounded-full bg-zinc-100 p-1">
            {(["csv", "json", "markdown"] as const).map((mode) => (
              <button key={mode} onClick={() => setInputMode(mode)} className={`min-w-0 rounded-full px-2 py-2 text-sm font-semibold transition sm:px-3 ${inputMode === mode ? "bg-white shadow-sm" : "text-zinc-500 hover:text-zinc-900"}`}>
                {mode === "markdown" ? "表格" : mode.toUpperCase()}
              </button>
            ))}
          </div>

          <textarea
            value={currentInputValue()}
            onChange={(event) => updateCurrentInput(event.target.value)}
            className="min-h-[230px] w-full min-w-0 resize-y overflow-x-auto rounded-xl border border-zinc-200 bg-zinc-50 p-4 font-mono text-sm leading-6 text-zinc-900 outline-none focus:border-blue-400 focus:bg-white"
            spellCheck={false}
          />

          <div className="mt-4 mb-4">
            <div className="mb-2 text-sm font-semibold text-zinc-700">快速模板</div>
            <div className="grid grid-cols-2 gap-2">
              {templatePresets.map((template) => (
                <button key={template.name} onClick={() => applyTemplate(template)} className={`rounded-xl border px-3 py-2.5 text-left text-sm font-medium transition ${type === template.type ? "border-blue-300 bg-blue-50 text-blue-700" : "border-zinc-200 bg-zinc-50 hover:bg-white"}`}>
                  {template.name}
                </button>
              ))}
            </div>
          </div>

          <div className="rounded-xl bg-zinc-50 p-4">
            <div className="mb-3 flex items-center gap-2 font-semibold">
              <CheckCircle2 className="size-4 text-emerald-500" />
              字段识别
            </div>
            <div className="grid gap-2">
              {parsed.columns.map((column) => (
                <div key={column.name} className="flex items-center justify-between gap-3 text-sm">
                  <span className="truncate text-zinc-700">{column.name}</span>
                  <span className="rounded-full bg-white px-2.5 py-1 text-xs text-zinc-600 shadow-sm">{column.type}</span>
                </div>
              ))}
            </div>
            {parseWarnings.length > 0 && (
              <div className="mt-3 space-y-1 text-xs text-amber-700">
                {parseWarnings.slice(0, 5).map((warning) => <div key={warning}>{warning}</div>)}
              </div>
            )}
          </div>

          <Field label="卡片 JSON" hint="没有字段就不显示">
            <textarea
              value={cardJson}
              onChange={(event) => setCardJson(event.target.value)}
              className="min-h-[120px] w-full min-w-0 resize-y overflow-x-auto rounded-xl border border-zinc-200 bg-zinc-50 p-3 font-mono text-xs leading-5 text-zinc-900 outline-none focus:border-blue-400 focus:bg-white"
              spellCheck={false}
            />
          </Field>
        </Panel>

        <section className="grid gap-5">
          <Panel className="p-5">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="font-semibold">2. 实时预览</h2>
                <p className="text-sm text-zinc-500">预览与 PNG/JPEG 下载使用同一条 @2x 导出路径，所见即所得。</p>
              </div>
              <span className="rounded-full bg-blue-50 px-4 py-2 text-sm text-blue-700 lg:hidden">{recommendation.reason}</span>
            </div>
            <MatchedExportPreview preview={exportPreview} fallbackSvg={rendered.svg} />
            <div className="mt-4 flex flex-wrap gap-2">
              <button onClick={copySvg} className="inline-flex items-center gap-2 rounded-full bg-zinc-100 px-4 py-2 text-sm font-semibold transition hover:bg-zinc-200">
                <Clipboard className="size-4" />
                复制公众号 SVG
              </button>
              <button onClick={() => downloadSvg(rendered.svg)} className="inline-flex items-center gap-2 rounded-full bg-blue-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-600">
                <Download className="size-4" />
                下载 SVG
              </button>
              {(["png", "webp", "jpeg"] as const).map((format) => (
                <button key={format} onClick={() => void downloadImage(format)} className="rounded-full bg-zinc-100 px-4 py-2 text-sm font-semibold transition hover:bg-zinc-200">
                  下载 {format.toUpperCase()} @2x
                </button>
              ))}
            </div>
          </Panel>

          <Panel className="p-5">
            <div className="mb-4">
              <h2 className="font-semibold">3. 选择图表</h2>
              <p className="text-sm text-zinc-500">按数据故事分组，点击即套用；缩略图就是导出效果。</p>
            </div>
            <div className="space-y-5">
              {chartGroups.map((group) => (
                <div key={group.group}>
                  <div className="mb-2 text-xs font-semibold uppercase tracking-wider text-zinc-400">{group.group}</div>
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                    {group.items.map((item) => (
                      <button
                        key={item.type}
                        onClick={() => selectChartType(item)}
                        className={`group overflow-hidden rounded-xl border text-left transition ${type === item.type ? "border-blue-400 ring-2 ring-blue-200" : "border-zinc-200 hover:border-zinc-300"}`}
                      >
                        <div className="svg-card-preview aspect-[4/3] w-full bg-zinc-50 p-1.5" dangerouslySetInnerHTML={{ __html: thumbnails.get(item.type) ?? "" }} />
                        <div className="border-t border-zinc-100 px-2.5 py-2">
                          <div className="text-sm font-semibold text-zinc-800">{item.name}</div>
                          <div className="truncate text-xs text-zinc-500">{item.desc}</div>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </Panel>
        </section>

        <Panel className="p-4 lg:col-span-2 2xl:col-span-1">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="font-semibold">4. 样式与导出</h2>
              <p className="text-sm text-zinc-500">主题、版式、色卡和导出都会写入下面的 API 请求 JSON。</p>
            </div>
            <Settings className="size-5 text-zinc-500" />
          </div>

          <div className="space-y-4">
            <Field label="标题">
              <input value={title} onChange={(event) => setTitle(event.target.value)} className={inputClass} />
            </Field>
            <Field label="副标题">
              <input value={subtitle} onChange={(event) => setSubtitle(event.target.value)} className={inputClass} />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="主题">
                <select value={theme} onChange={(event) => setTheme(event.target.value as ThemeId)} className={selectClass}>
                  {THEME_IDS.map((item) => <option key={item} value={item}>{THEMES[item].name}</option>)}
                </select>
              </Field>
              <Field label="版式">
                <select value={layout} onChange={(event) => setLayout(event.target.value as LayoutName)} className={selectClass}>
                  {Object.keys(layoutSizes).map((item) => <option key={item} value={item}>{item}</option>)}
                </select>
              </Field>
            </div>
            <Field label="API 默认导出格式">
              <select value={exportFormat} onChange={(event) => setExportFormat(event.target.value as ExportFormat)} className={selectClass}>
                {EXPORT_FORMATS.map((item) => <option key={item} value={item}>{exportLabels[item]}</option>)}
              </select>
            </Field>

            <Field label="种子色卡" hint={`当前图形匹配 ${visualItemCount} 个数据项`}>
              <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-3">
                <div className="mb-2 flex items-center justify-between gap-3 text-xs text-zinc-500">
                  <span>输入种子色，系统会按数据项自动补齐完整色卡。</span>
                  <span className="rounded-full bg-white px-2.5 py-1 font-mono shadow-sm">{resolvedPalette.length} colors</span>
                </div>
                <div className="mb-3 flex flex-wrap gap-1.5">
                  {resolvedPalette.slice(0, 24).map((color, index) => (
                    <button key={`${color}-${index}`} onClick={() => copyColor(color)} className="size-7 rounded-md border border-zinc-200 shadow-sm transition hover:scale-110 hover:shadow-md" style={{ backgroundColor: color }} aria-label={`复制 ${color}`} />
                  ))}
                </div>
                <input value={paletteText} onChange={(event) => setPaletteText(event.target.value)} className="w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 font-mono text-xs outline-none focus:border-blue-400" />
                <div className="mt-3 grid grid-cols-2 gap-2">
                  {palettePresets.map((preset) => (
                    <button key={preset.name} onClick={() => setPaletteText(preset.colors.join(", "))} className="flex items-center gap-2 rounded-lg bg-white px-3 py-2 text-xs font-semibold transition hover:bg-zinc-100">
                      <Palette className="size-3.5" />
                      {preset.name}
                    </button>
                  ))}
                </div>
              </div>
            </Field>

            <label className="flex items-center justify-between gap-3 rounded-xl bg-zinc-50 px-4 py-3 text-sm font-semibold text-zinc-700">
              <span className="inline-flex items-center gap-2"><ShieldCheck className="size-4 text-emerald-500" />微信安全模式</span>
              <input type="checkbox" checked={wechatSafe} onChange={(event) => setWechatSafe(event.target.checked)} className="size-4 accent-blue-500" />
            </label>
          </div>

          <div className="mt-5 rounded-xl bg-zinc-50 p-4">
            <div className="mb-3 flex items-center justify-between">
              <span className="font-semibold">兼容性检测</span>
              <span className="rounded-full bg-emerald-100 px-3 py-1 text-sm font-semibold text-emerald-700">{rendered.compatibility.score}/100</span>
            </div>
            <div className="space-y-1 text-xs text-zinc-600">
              {rendered.compatibility.issues.length === 0
                ? <div>没有检测到阻塞问题。</div>
                : rendered.compatibility.issues.slice(0, 5).map((issue) => <div key={`${issue.code}-${issue.message}`}>{issue.code}: {issue.message}</div>)}
            </div>
          </div>

          <div className="mt-4 grid gap-2">
            <button onClick={copyApiRequest} className="inline-flex items-center justify-center gap-2 rounded-full bg-blue-500 px-4 py-3 text-sm font-semibold text-white transition hover:bg-blue-600">
              <RefreshCw className="size-4" />
              复制 API 请求 JSON
            </button>
            <button onClick={copySvg} className="inline-flex items-center justify-center gap-2 rounded-full bg-zinc-100 px-4 py-3 text-sm font-semibold transition hover:bg-zinc-200">
              <FileJson className="size-4" />
              复制公众号 SVG
            </button>
            {status ? <div className="rounded-xl bg-zinc-50 px-3 py-2 text-xs text-zinc-500">{status}</div> : null}
          </div>
        </Panel>
      </div>

      <Toast toast={toast} />
    </main>
  );
}
