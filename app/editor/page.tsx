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
  MOTION_PRESETS,
  THEME_IDS,
  VISUAL_STORIES,
  VISUAL_TYPES,
  CardSpecSchema,
  defaultMotionForType,
  type CardSpec,
  type DataRow,
  type ExportFormat,
  type MotionPreset,
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

const dualAreaRows: DataRow[] = [
  { month: "2026-01", 自然流量: 29, 付费广告: 14 },
  { month: "2026-02", 自然流量: 38, 付费广告: 24 },
  { month: "2026-03", 自然流量: 33, 付费广告: 18 },
  { month: "2026-04", 自然流量: 22, 付费广告: 30 },
  { month: "2026-05", 自然流量: 41, 付费广告: 27 },
  { month: "2026-06", 自然流量: 25, 付费广告: 19 },
  { month: "2026-07", 自然流量: 28, 付费广告: 24 },
  { month: "2026-08", 自然流量: 31, 付费广告: 28 },
  { month: "2026-09", 自然流量: 18, 付费广告: 15 },
  { month: "2026-10", 自然流量: 52, 付费广告: 42 },
  { month: "2026-11", 自然流量: 36, 付费广告: 32 },
  { month: "2026-12", 自然流量: 31, 付费广告: 24 }
];

const dualAreaCsv = [
  "month,自然流量,付费广告",
  ...dualAreaRows.map((row) => `${row.month},${row.自然流量},${row.付费广告}`)
].join("\n");

const dualAreaMarkdown = [
  "| month | 自然流量 | 付费广告 |",
  "| --- | ---: | ---: |",
  ...dualAreaRows.map((row) => `| ${row.month} | ${row.自然流量} | ${row.付费广告} |`)
].join("\n");

const dualAreaJson = JSON.stringify(dualAreaRows, null, 2);

const horizontalBarRows: DataRow[] = [
  { channel: "自然流量", value: 118 },
  { channel: "付费广告", value: 96 },
  { channel: "公众号", value: 82 },
  { channel: "小红书", value: 77 },
  { channel: "社群转化", value: 64 },
  { channel: "内容推荐", value: 58 },
  { channel: "搜索引擎", value: 43 }
];

const horizontalBarCsv = rowsToCsv(horizontalBarRows, ["channel", "value"]);
const horizontalBarMarkdown = rowsToMarkdown(horizontalBarRows, ["channel", "value"]);
const horizontalBarJson = JSON.stringify(horizontalBarRows, null, 2);

const tokenActivityRows: DataRow[] = Array.from({ length: 365 }, (_, index) => {
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

const tokenActivityCsv = rowsToCsv(tokenActivityRows, ["date", "value"]);
const tokenActivityMarkdown = rowsToMarkdown(tokenActivityRows, ["date", "value"]);
const tokenActivityJson = JSON.stringify(tokenActivityRows, null, 2);

const defaultJson = JSON.stringify(DEFAULT_VISUAL_SPEC.data.rows, null, 2);
const defaultMarkdown = rowsToMarkdown(DEFAULT_VISUAL_SPEC.data.rows, ["month", "value", "channel"]);
const defaultCardJson = JSON.stringify(DEFAULT_VISUAL_SPEC.card, null, 2);

const layoutSizes = {
  "小红书竖卡": { width: 1080, height: 1440 },
  "高清横卡": { width: 1440, height: 1000 },
  "公众号横卡": { width: 720, height: 500 },
  "方形社媒": { width: 640, height: 640 },
  "PPT 宽图": { width: 960, height: 540 },
  "紧凑卡片": { width: 640, height: 420 },
  "活动热力条": { width: 960, height: 260 }
} as const;

const palettePresets = [
  { name: "Hero 蓝", colors: ["#0a84ff", "#38bdf8", "#22c55e", "#f59e0b", "#f472b6"] },
  { name: "极光科技", colors: ["#30f6ff", "#a855f7", "#36d399", "#f8d66d", "#ff7ab6"] },
  { name: "报告克制", colors: ["#111827", "#475569", "#0ea5e9", "#16a394", "#f59e0b"] },
  { name: "内容传播", colors: ["#2f63d8", "#d84d8b", "#f06a3f", "#10b981", "#7b61ff"] }
];

const templatePresets = [
  {
    name: "小红书数据卡",
    title: "销售表现",
    subtitle: "最近周期销售数据，一眼看清高峰月份",
    type: "bar" as VisualType,
    story: "magnitude" as VisualStory,
    motion: "grow" as MotionPreset,
    theme: "editorial-light" as ThemeId,
    sampleCsv: defaultCsv,
    sampleJson: defaultJson,
    sampleMarkdown: defaultMarkdown,
    sampleCardJson: defaultCardJson,
    layout: "小红书竖卡" as keyof typeof layoutSizes
  },
  {
    name: "横向排行条形",
    title: "渠道排行",
    subtitle: "按当前数据排序的横向对比",
    type: "horizontal-bar" as VisualType,
    story: "ranking" as VisualStory,
    motion: "grow" as MotionPreset,
    theme: "editorial-light" as ThemeId,
    sampleCsv: horizontalBarCsv,
    sampleJson: horizontalBarJson,
    sampleMarkdown: horizontalBarMarkdown,
    sampleCardJson: ""
  },
  {
    name: "Token 活动热力图",
    title: "Token 活动",
    subtitle: "",
    type: "heatmap" as VisualType,
    story: "change-over-time" as VisualStory,
    motion: "fade-up" as MotionPreset,
    theme: "editorial-light" as ThemeId,
    sampleCsv: tokenActivityCsv,
    sampleJson: tokenActivityJson,
    sampleMarkdown: tokenActivityMarkdown,
    sampleCardJson: "",
    layout: "活动热力条" as keyof typeof layoutSizes
  },
  {
    name: "增长趋势折线",
    title: "访问趋势",
    subtitle: "按月份展开的核心指标",
    type: "line" as VisualType,
    story: "change-over-time" as VisualStory,
    motion: "draw" as MotionPreset,
    theme: "editorial-light" as ThemeId,
    sampleCsv: defaultCsv,
    sampleJson: defaultJson,
    sampleMarkdown: defaultMarkdown,
    sampleCardJson: ""
  },
  {
    name: "双线面积趋势",
    title: "访问来源趋势",
    subtitle: "双系列面积与趋势线来自同一份数据",
    type: "area" as VisualType,
    story: "change-over-time" as VisualStory,
    motion: "draw" as MotionPreset,
    theme: "editorial-light" as ThemeId,
    sampleCsv: dualAreaCsv,
    sampleJson: dualAreaJson,
    sampleMarkdown: dualAreaMarkdown,
    sampleCardJson: ""
  },
  {
    name: "渠道占比圆环",
    title: "渠道占比",
    subtitle: "按渠道汇总的来源构成",
    type: "donut" as VisualType,
    story: "part-to-whole" as VisualStory,
    motion: "sweep" as MotionPreset,
    theme: "editorial-light" as ThemeId,
    sampleCsv: defaultCsv,
    sampleJson: defaultJson,
    sampleMarkdown: defaultMarkdown,
    sampleCardJson: ""
  },
  {
    name: "玫瑰构成图",
    title: "玫瑰构成",
    subtitle: "按渠道汇总后的半径构成",
    type: "rose" as VisualType,
    story: "part-to-whole" as VisualStory,
    motion: "bloom" as MotionPreset,
    theme: "editorial-light" as ThemeId,
    sampleCsv: defaultCsv,
    sampleJson: defaultJson,
    sampleMarkdown: defaultMarkdown,
    sampleCardJson: ""
  },
  {
    name: "单指标快照",
    title: "核心指标",
    subtitle: "主指标、趋势和迷你柱图都来自输入数据",
    type: "metric-card" as VisualType,
    story: "single-metric" as VisualStory,
    motion: "count-up" as MotionPreset,
    theme: "editorial-light" as ThemeId,
    sampleCsv: defaultCsv,
    sampleJson: defaultJson,
    sampleMarkdown: defaultMarkdown,
    sampleCardJson: defaultCardJson
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
  motionPreset: MotionPreset;
  exportFormat: ExportFormat;
  layout: keyof typeof layoutSizes;
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
    motion: {
      ...defaultMotionForType(params.type),
      preset: params.motionPreset
    },
    export: {
      ...DEFAULT_VISUAL_SPEC.export,
      ...size,
      format: params.exportFormat,
      wechatSafeMode: params.wechatSafe
    }
  };
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
    <div className="svg-card-preview min-w-0 rounded-xl border border-zinc-200 bg-zinc-50 p-3">
      {preview.status === "loading" ? <div className="py-4 text-center text-sm font-medium text-zinc-500">正在同步导出预览...</div> : null}
      {preview.status === "error" ? <div className="py-4 text-center text-sm font-medium text-amber-700">{preview.message}</div> : null}
      <div dangerouslySetInnerHTML={{ __html: fallbackSvg }} />
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
  const [theme, setTheme] = useState<ThemeId>("editorial-light");
  const [motionPreset, setMotionPreset] = useState<MotionPreset>("grow");
  const [layout, setLayout] = useState<keyof typeof layoutSizes>("小红书竖卡");
  const [exportFormat, setExportFormat] = useState<ExportFormat>("animated-svg");
  const [wechatSafe, setWechatSafe] = useState(true);
  const [title, setTitle] = useState("销售表现");
  const [subtitle, setSubtitle] = useState("最近周期销售数据");
  const [status, setStatus] = useState("");
  const [exportPreview, setExportPreview] = useState<ExportPreviewState>({ src: "", status: "idle", message: "" });

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
      const parsed = CardSpecSchema.safeParse(JSON.parse(cardJson));
      if (!parsed.success) {
        return { card: undefined, warning: "卡片 JSON 字段不符合 schema，KPI 和周期将不显示。" };
      }
      return { card: parsed.data, warning: "" };
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
        motionPreset,
        exportFormat,
        layout,
        title,
        subtitle,
        wechatSafe
      }),
    [exportFormat, layout, motionPreset, palette.colors, parsed.rows, parsedCard.card, story, subtitle, theme, title, type, wechatSafe]
  );

  const rendered = useMemo(() => renderAnimatedSvg(spec), [spec]);
  const visualItemCount = useMemo(() => resolveVisualItemCount(spec), [spec]);
  const resolvedPalette = useMemo(() => resolvePaletteForSpec(spec, THEMES[spec.theme]), [spec]);
  const apiRequest = JSON.stringify(spec, null, 2);

  useEffect(() => {
    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      setExportPreview((current) => ({ ...current, status: "loading", message: "正在同步导出预览..." }));
      try {
        const response = await fetch("/api/v1/render", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ ...spec, export: { ...spec.export, format: "png" } }),
          signal: controller.signal
        });

        if (!response.ok) {
          setExportPreview((current) => ({ ...current, status: "error", message: `导出预览同步失败：${response.status}` }));
          return;
        }

        const json = await response.json();
        setExportPreview({
          src: json.assets?.imageDataUrl ?? "",
          status: "ready",
          message: "导出预览已同步"
        });
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

  function applyTemplate(template: (typeof templatePresets)[number]) {
    setType(template.type);
    setStory(template.story);
    setMotionPreset(template.motion);
    setTheme(template.theme);
    setTitle(template.title);
    setSubtitle(template.subtitle);
    setLayout("layout" in template && template.layout ? template.layout : "公众号横卡");
    if ("sampleCsv" in template && template.sampleCsv) {
      setCsv(template.sampleCsv);
      setJson("sampleJson" in template && template.sampleJson ? template.sampleJson : json);
      setMarkdown("sampleMarkdown" in template && template.sampleMarkdown ? template.sampleMarkdown : markdown);
    }
    if ("sampleCardJson" in template) {
      setCardJson(template.sampleCardJson ?? "");
    }
    setExportFormat("animated-svg");
    setStatus(`已套用模板：${template.name}`);
  }

  async function downloadImage(format: "png" | "webp" | "jpeg") {
    setStatus(`正在生成 ${format.toUpperCase()}...`);
    const response = await fetch("/api/v1/render", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        accept: `image/${format}`
      },
      body: JSON.stringify({ ...spec, export: { ...spec.export, format } })
    });
    if (!response.ok) {
      setStatus(`导出失败：${response.status}`);
      return;
    }
    downloadBlob(await response.blob(), `vizforge-motion.${format}`);
    setStatus(`${format.toUpperCase()} 已下载`);
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
                <div className="hidden truncate text-xs text-zinc-500 sm:block">数据输入、模板套用、动态 SVG、静态图片和 API 请求。</div>
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
            <Link href="/playground" aria-label="API 调试台" className="grid size-10 place-items-center rounded-full bg-zinc-100 text-zinc-700 transition hover:bg-zinc-200 sm:hidden">
              <FileJson className="size-4" />
            </Link>
            <div className="hidden items-center gap-2 rounded-full bg-emerald-100 px-3 py-2 text-sm font-semibold text-emerald-700 md:inline-flex">
              <ShieldCheck className="size-4" />
              微信 {rendered.compatibility.score}/100
            </div>
          </div>
        </div>
      </header>

      <div className="grid min-w-0 gap-4 p-4 sm:gap-5 sm:p-5 lg:grid-cols-[340px_minmax(0,1fr)] xl:grid-cols-[360px_minmax(0,1fr)] 2xl:grid-cols-[390px_minmax(0,1fr)_390px]">
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
            className="min-h-[250px] w-full min-w-0 resize-y overflow-x-auto rounded-xl border border-zinc-200 bg-zinc-50 p-4 font-mono text-sm leading-6 text-zinc-900 outline-none focus:border-blue-400 focus:bg-white"
            spellCheck={false}
          />

          <div className="mt-4 rounded-xl bg-zinc-50 p-4">
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

          <Field label="卡片 JSON" hint="没有字段就不显示" >
            <textarea
              value={cardJson}
              onChange={(event) => setCardJson(event.target.value)}
              className="min-h-[140px] w-full min-w-0 resize-y overflow-x-auto rounded-xl border border-zinc-200 bg-zinc-50 p-3 font-mono text-xs leading-5 text-zinc-900 outline-none focus:border-blue-400 focus:bg-white"
              spellCheck={false}
            />
          </Field>
        </Panel>

        <section className="grid gap-5">
          <Panel className="p-5">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="font-semibold">2. 实时预览</h2>
                <p className="text-sm text-zinc-500">预览和 PNG/JPEG 下载使用同一条图片导出路径。</p>
              </div>
              <span className="rounded-full bg-blue-50 px-4 py-2 text-sm text-blue-700 lg:hidden">{recommendation.reason}</span>
            </div>
            <MatchedExportPreview preview={exportPreview} fallbackSvg={rendered.svg} />
          </Panel>

          <Panel className="p-5">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="font-semibold">3. 动态 SVG / 图片导出</h2>
                <p className="text-sm text-zinc-500">图片预览与下载保持同源；SVG 仍可复制用于公众号。</p>
              </div>
              <div className="flex flex-wrap gap-2">
                <button onClick={() => copy(rendered.svg)} className="inline-flex items-center gap-2 rounded-full bg-zinc-100 px-4 py-2 text-sm font-semibold transition hover:bg-zinc-200">
                  <Clipboard className="size-4" />
                  复制 SVG
                </button>
                <button onClick={() => downloadSvg(rendered.svg)} className="inline-flex items-center gap-2 rounded-full bg-blue-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-600">
                  <Download className="size-4" />
                  下载 SVG
                </button>
              </div>
            </div>
            <MatchedExportPreview preview={exportPreview} fallbackSvg={rendered.svg} />
            <div className="mt-4 grid gap-2 sm:grid-cols-3">
              {(["png", "webp", "jpeg"] as const).map((format) => (
                <button key={format} onClick={() => void downloadImage(format)} className="rounded-full bg-zinc-100 px-4 py-2 text-sm font-semibold transition hover:bg-zinc-200">
                  下载 {format.toUpperCase()}
                </button>
              ))}
            </div>
          </Panel>
        </section>

        <Panel className="p-4 lg:col-span-2 2xl:col-span-1">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="font-semibold">4. 模板与 API 配置</h2>
              <p className="text-sm text-zinc-500">设计围绕功能：模板、色卡和导出都会写入请求 JSON。</p>
            </div>
            <Settings className="size-5 text-zinc-500" />
          </div>

          <div className="mb-5 grid gap-2">
            {templatePresets.map((template) => (
              <button key={template.name} onClick={() => applyTemplate(template)} className={`flex items-center justify-between rounded-xl border px-4 py-3 text-left transition ${type === template.type ? "border-blue-300 bg-blue-50 text-blue-700" : "border-zinc-200 bg-zinc-50 hover:bg-white"}`}>
                <span className="font-semibold">{template.name}</span>
                <Sparkles className="size-4" />
              </button>
            ))}
          </div>

          <div className="space-y-4">
            <Field label="标题">
              <input value={title} onChange={(event) => setTitle(event.target.value)} className={inputClass} />
            </Field>
            <Field label="副标题">
              <input value={subtitle} onChange={(event) => setSubtitle(event.target.value)} className={inputClass} />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="图表类型">
                <select
                  value={type}
                  onChange={(event) => {
                    const nextType = event.target.value as VisualType;
                    setType(nextType);
                    setMotionPreset(defaultMotionForType(nextType).preset);
                  }}
                  className={selectClass}
                >
                  {VISUAL_TYPES.map((item) => <option key={item} value={item}>{item}</option>)}
                </select>
              </Field>
              <Field label="数据故事">
                <select value={story} onChange={(event) => setStory(event.target.value as VisualStory)} className={selectClass}>
                  {VISUAL_STORIES.map((item) => <option key={item} value={item}>{item}</option>)}
                </select>
              </Field>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Field label="主题">
                <select value={theme} onChange={(event) => setTheme(event.target.value as ThemeId)} className={selectClass}>
                  {THEME_IDS.map((item) => <option key={item} value={item}>{THEMES[item].name}</option>)}
                </select>
              </Field>
              <Field label="版式">
                <select value={layout} onChange={(event) => setLayout(event.target.value as keyof typeof layoutSizes)} className={selectClass}>
                  {Object.keys(layoutSizes).map((item) => <option key={item} value={item}>{item}</option>)}
                </select>
              </Field>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Field label="动画">
                <select value={motionPreset} onChange={(event) => setMotionPreset(event.target.value as MotionPreset)} className={selectClass}>
                  {MOTION_PRESETS.map((item) => <option key={item} value={item}>{item}</option>)}
                </select>
              </Field>
              <Field label="API 默认导出">
                <select value={exportFormat} onChange={(event) => setExportFormat(event.target.value as ExportFormat)} className={selectClass}>
                  {EXPORT_FORMATS.map((item) => <option key={item} value={item}>{exportLabels[item]}</option>)}
                </select>
              </Field>
            </div>

            <Field label="API 色卡" hint={`当前图形匹配 ${visualItemCount} 个数据项`}>
              <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-3">
                <div className="mb-2 flex items-center justify-between gap-3 text-xs text-zinc-500">
                  <span>输入的是种子色；下面展示渲染器实际使用的完整色卡。</span>
                  <span className="rounded-full bg-white px-2.5 py-1 font-mono shadow-sm">{resolvedPalette.length} colors</span>
                </div>
                <div className="mb-3 grid max-h-60 grid-cols-1 gap-2 overflow-y-auto pr-1 sm:grid-cols-2">
                  {resolvedPalette.map((color, index) => (
                    <div key={`${color}-${index}`} className="group flex items-center gap-2 rounded-lg bg-white p-1.5 transition hover:bg-zinc-100">
                      <button
                        onClick={() => copy(color)}
                        className="size-10 shrink-0 rounded-md border border-zinc-200 shadow-sm"
                        style={{ backgroundColor: color }}
                        aria-label={`复制 Chart ${index + 1} 色号 ${color}`}
                      />
                      <div className="min-w-0 flex-1">
                        <div className="text-xs font-semibold text-zinc-700">Chart {index + 1}</div>
                        <div className="truncate font-mono text-xs text-zinc-500">{color}</div>
                      </div>
                      <button
                        onClick={() => copy(color)}
                        className="grid size-7 place-items-center rounded-md text-zinc-400 opacity-0 transition hover:bg-white hover:text-zinc-900 group-hover:opacity-100"
                        aria-label={`复制 ${color}`}
                      >
                        <Clipboard className="size-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
                <input value={paletteText} onChange={(event) => setPaletteText(event.target.value)} className="w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 font-mono text-xs outline-none focus:border-blue-400" />
                <div className="mt-2 text-xs text-zinc-500">可以只传 1-3 个主色，系统会按数据项自动补齐；也可以传足完整色卡。</div>
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
            <button onClick={() => copy(apiRequest)} className="inline-flex items-center justify-center gap-2 rounded-full bg-blue-500 px-4 py-3 text-sm font-semibold text-white transition hover:bg-blue-600">
              <RefreshCw className="size-4" />
              复制 API 请求
            </button>
            <button onClick={() => copy(rendered.svg)} className="inline-flex items-center justify-center gap-2 rounded-full bg-zinc-100 px-4 py-3 text-sm font-semibold transition hover:bg-zinc-200">
              <FileJson className="size-4" />
              复制公众号 SVG
            </button>
            {status ? <div className="rounded-xl bg-zinc-50 px-3 py-2 text-xs text-zinc-500">{status}</div> : null}
          </div>
        </Panel>
      </div>
    </main>
  );
}
