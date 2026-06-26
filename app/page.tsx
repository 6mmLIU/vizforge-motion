"use client";

import { renderAnimatedSvg } from "@/lib/motion/animatedSvgRenderer";
import { THEMES } from "@/lib/visual/themes";
import { DEFAULT_VISUAL_SPEC, type DataRow, type ThemeId, type VisualSpec, type VisualStory, type VisualType } from "@/lib/visual/visualSpec";
import { ArrowUpRight, ChartNoAxesCombined, Code2, FileJson, Github, Palette, ShieldCheck, Sparkles, Wand2, Zap } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";
import { Toast, useToast } from "./_hooks/useToast";

const nav = [
  { label: "图库", href: "#gallery" },
  { label: "编辑器", href: "/editor" },
  { label: "API", href: "/playground" },
  { label: "文档", href: "/docs" }
];

const palettePresets = [
  { name: "经典蓝", colors: ["#3b6ef5", "#12b3a6", "#f59e0b", "#ef5da8", "#7c5cff"] },
  { name: "内容传播", colors: ["#2f63d8", "#d84d8b", "#f06a3f", "#10b981", "#7b61ff"] },
  { name: "霓虹夜色", colors: ["#5b8cff", "#33d6c0", "#ffc24b", "#ff77b0", "#a78bfa"] },
  { name: "报告克制", colors: ["#1f2937", "#4b5563", "#2563eb", "#0ea5e9", "#64748b"] }
];

const themeOptions: ThemeId[] = ["light", "dark", "warm", "mono"];

const trendRows: DataRow[] = [
  { month: "2026-01", value: 18 },
  { month: "2026-02", value: 34 },
  { month: "2026-03", value: 27 },
  { month: "2026-04", value: 44 },
  { month: "2026-05", value: 38 },
  { month: "2026-06", value: 52 }
];

const compositionRows: DataRow[] = [
  { channel: "自然流量", value: 42 },
  { channel: "付费广告", value: 31 },
  { channel: "公众号", value: 24 },
  { channel: "小红书", value: 18 },
  { channel: "社群", value: 12 }
];

const rankingRows: DataRow[] = [
  { channel: "自然流量", value: 118 },
  { channel: "付费广告", value: 96 },
  { channel: "公众号", value: 82 },
  { channel: "小红书", value: 77 },
  { channel: "社群转化", value: 64 }
];

const dualSeriesRows: DataRow[] = [
  ...["2026-01", "2026-02", "2026-03", "2026-04", "2026-05", "2026-06"].map((month, index) => ({ month, channel: "自然流量", value: [29, 38, 33, 42, 41, 52][index] })),
  ...["2026-01", "2026-02", "2026-03", "2026-04", "2026-05", "2026-06"].map((month, index) => ({ month, channel: "付费广告", value: [14, 24, 18, 30, 27, 42][index] }))
];

const heatmapRows: DataRow[] = Array.from({ length: 119 }, (_, index) => {
  const date = new Date(Date.UTC(2026, 0, 1 + index));
  const value = index % 13 === 0 ? 0 : Math.round(Math.abs(Math.sin(index / 6) * 9 + (index % 5) * 2));
  return { date: date.toISOString().slice(0, 10), value };
});

type GalleryItem = {
  title: string;
  story: string;
  type: VisualType;
  visualStory: VisualStory;
  rows: DataRow[];
  mappings: VisualSpec["mappings"];
  width: number;
  height: number;
  caption?: string;
  card?: VisualSpec["card"];
};

const gallery: GalleryItem[] = [
  {
    title: "销售表现",
    story: "增长 / 对比",
    type: "bar",
    visualStory: "magnitude",
    rows: trendRows,
    mappings: { category: "month", value: "value" },
    width: 1080,
    height: 760,
    caption: "月度销售柱状图，适合公众号头图",
    card: {
      periodLabel: "最近 6 月",
      metrics: [
        { label: "周销售额", value: "28,441", prefix: "$", delta: "3.3%", trend: "up" },
        { label: "总销量", value: 278, delta: "5.1%", trend: "up" }
      ]
    }
  },
  {
    title: "渠道占比",
    story: "构成 / 占比",
    type: "donut",
    visualStory: "part-to-whole",
    rows: compositionRows,
    mappings: { category: "channel", value: "value" },
    width: 1080,
    height: 760,
    caption: "环形占比图，渠道来源一目了然"
  },
  {
    title: "访问来源趋势",
    story: "时间 / 趋势",
    type: "area",
    visualStory: "change-over-time",
    rows: dualSeriesRows,
    mappings: { x: "month", y: "value", category: "month", value: "value", series: "channel" },
    width: 1080,
    height: 760,
    caption: "双系列面积趋势，自然 vs 付费"
  },
  {
    title: "渠道排行",
    story: "排行 / 榜单",
    type: "horizontal-bar",
    visualStory: "ranking",
    rows: rankingRows,
    mappings: { category: "channel", value: "value" },
    width: 1080,
    height: 760,
    caption: "横向排行榜，适合榜单类内容"
  },
  {
    title: "渠道构成",
    story: "构成 / 传播",
    type: "rose",
    visualStory: "part-to-whole",
    rows: compositionRows,
    mappings: { category: "channel", value: "value" },
    width: 1080,
    height: 760,
    caption: "玫瑰图，强传播感的构成关系"
  },
  {
    title: "活动热力图",
    story: "时间 / 活跃度",
    type: "heatmap",
    visualStory: "change-over-time",
    rows: heatmapRows,
    mappings: { category: "date", value: "value", x: "date", y: "value" },
    width: 1280,
    height: 560,
    caption: "日历热力图，颜色越深越活跃"
  }
];

const features: Array<{ Icon: LucideIcon; title: string; body: string }> = [
  { Icon: Sparkles, title: "数据驱动渲染", body: "图形数量由数据决定，多少行就画多少，永远只展示真实数据。" },
  { Icon: ShieldCheck, title: "微信安全 SVG", body: "纯 SVG + SMIL 动画，无脚本无外链，可直接嵌入公众号图文。" },
  { Icon: Palette, title: "自动色卡", body: "传入种子色，系统按数据项数自动补齐协调色卡。" },
  { Icon: Zap, title: "一次请求多种产物", body: "同一份 VisualSpec 同时输出 SVG、PNG、WebP、JPEG 与兼容性检测。" }
];

function svgFor(item: GalleryItem, theme: ThemeId, palette: string[]): string {
  return renderAnimatedSvg({
    ...DEFAULT_VISUAL_SPEC,
    title: item.title,
    subtitle: undefined,
    insight: undefined,
    caption: item.caption,
    source: "VizForge Motion",
    card: item.card,
    type: item.type,
    story: item.visualStory,
    theme,
    palette,
    data: { rows: item.rows },
    mappings: item.mappings,
    export: { ...DEFAULT_VISUAL_SPEC.export, width: item.width, height: item.height }
  }).svg;
}

function Chip({ children }: { children: React.ReactNode }) {
  return <span className="rounded-full bg-zinc-100 px-3 py-1.5 text-sm font-semibold text-zinc-600">{children}</span>;
}

export default function HomePage() {
  const [palette, setPalette] = useState(palettePresets[0].colors);
  const [theme, setTheme] = useState<ThemeId>("light");
  const { toast, show } = useToast();
  const cards = useMemo(() => gallery.map((item) => ({ ...item, svg: svgFor(item, theme, palette) })), [palette, theme]);

  function handlePalette(preset: (typeof palettePresets)[number]) {
    setPalette(preset.colors);
    show(`已切换色卡：${preset.name}`);
  }

  function handleTheme(option: ThemeId) {
    setTheme(option);
    show(`已切换主题：${THEMES[option].name}`);
  }

  return (
    <main className="min-h-screen overflow-x-hidden bg-[#f7f7f8] text-zinc-950">
      <header className="sticky top-0 z-40 border-b border-zinc-200/70 bg-[#f7f7f8]/90 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-[1320px] items-center justify-between px-4 sm:px-6">
          <Link href="/" className="flex items-center gap-2.5 text-2xl font-bold tracking-tight">
            <ChartNoAxesCombined className="size-7 text-blue-600" />
            VizForge
          </Link>
          <nav className="hidden items-center gap-7 text-sm font-semibold text-zinc-600 md:flex">
            {nav.map((item) => <Link key={item.label} href={item.href} className="transition hover:text-zinc-950">{item.label}</Link>)}
          </nav>
          <div className="flex items-center gap-2">
            <Link href="/playground" aria-label="API 调试台" className="grid size-10 place-items-center rounded-full bg-zinc-100 text-zinc-700 transition hover:bg-zinc-200"><Code2 className="size-5" /></Link>
            <Link href="/docs" aria-label="文档" className="grid size-10 place-items-center rounded-full bg-zinc-100 text-zinc-700 transition hover:bg-zinc-200"><Github className="size-5" /></Link>
            <Link href="/editor" className="hidden rounded-full bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700 sm:inline-flex">开始生成</Link>
          </div>
        </div>
      </header>

      <section className="mx-auto max-w-[1320px] px-4 pb-10 pt-12 text-center sm:px-6 sm:pt-16">
        <div className="mx-auto mb-5 inline-flex items-center gap-2 rounded-full bg-blue-50 px-4 py-2 text-sm font-semibold text-blue-700">
          <Wand2 className="size-4" />
          数据可视化素材生成平台
        </div>
        <h1 className="mx-auto max-w-4xl text-balance text-4xl font-semibold leading-tight tracking-tight text-zinc-950 sm:text-5xl md:text-6xl">
          把原始数据变成可直接发布的<span className="text-blue-600">高级图表素材</span>
        </h1>
        <p className="mx-auto mt-5 max-w-2xl text-balance text-lg leading-8 text-zinc-500">
          粘贴 CSV、JSON 或表格，一键生成美观、统一、可自动化调用的图表卡片、动态 SVG 与高清图片，直接用于公众号、小红书与社媒运营。
        </p>
        <div className="mt-7 flex flex-wrap justify-center gap-3">
          <Link href="/editor" className="rounded-full bg-blue-600 px-7 py-3 text-base font-semibold text-white shadow-sm transition hover:bg-blue-700">打开编辑器</Link>
          <Link href="/playground" className="rounded-full border border-zinc-200 bg-white px-7 py-3 text-base font-semibold shadow-sm transition hover:bg-zinc-50">查看 API</Link>
        </div>
      </section>

      <section id="gallery" className="mx-auto max-w-[1320px] px-4 pb-16 sm:px-6">
        <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
          <div>
            <h2 className="text-3xl font-semibold tracking-tight">真实导出图库</h2>
            <p className="mt-2 text-zinc-500">下面每一张都由渲染引擎实时生成，与你在编辑器导出的完全一致。切换主题和色卡看看效果。</p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-1.5 rounded-full bg-white p-1 shadow-sm ring-1 ring-zinc-200">
              {themeOptions.map((option) => (
                <button
                  key={option}
                  onClick={() => handleTheme(option)}
                  aria-pressed={theme === option}
                  className={`rounded-full px-3 py-1.5 text-sm font-semibold transition ${theme === option ? "bg-zinc-950 text-white" : "text-zinc-600 hover:text-zinc-950"}`}
                >
                  {THEMES[option].name}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-2">
              {palettePresets.map((preset) => (
                <button
                  key={preset.name}
                  onClick={() => handlePalette(preset)}
                  aria-label={preset.name}
                  aria-pressed={palette[0] === preset.colors[0]}
                  className={`flex items-center gap-1 rounded-full border p-1.5 transition ${palette[0] === preset.colors[0] ? "border-zinc-950 bg-white" : "border-transparent hover:bg-white"}`}
                >
                  {preset.colors.slice(0, 4).map((color) => <span key={color} className="size-5 rounded-full" style={{ backgroundColor: color }} />)}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {cards.map((item) => {
            const editorHref = `/editor?type=${item.type}&story=${item.visualStory}&title=${encodeURIComponent(item.title)}`;
            return (
              <article
                key={item.title}
                className="group overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-[0_2px_12px_rgba(0,0,0,0.04)] transition duration-300 hover:-translate-y-1 hover:shadow-[0_18px_40px_rgba(0,0,0,0.10)]"
              >
                <Link href={editorHref} className="block" aria-label={`用「${item.title}」模板打开编辑器`}>
                  <div className="svg-card-preview bg-zinc-50 p-3 transition duration-300 group-hover:scale-[1.015]" dangerouslySetInnerHTML={{ __html: item.svg }} />
                </Link>
                <div className="flex items-center justify-between gap-3 border-t border-zinc-100 px-4 py-3">
                  <div className="min-w-0">
                    <div className="truncate font-semibold">{item.title}</div>
                    <div className="truncate text-sm text-zinc-500">{item.caption}</div>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <span className="rounded-full bg-zinc-100 px-3 py-1 text-xs font-semibold text-zinc-600">{item.story}</span>
                    <Link
                      href={editorHref}
                      className="hidden rounded-full bg-blue-600/10 px-3 py-1 text-xs font-semibold text-blue-700 transition hover:bg-blue-600 hover:text-white md:inline-flex"
                    >
                      套用
                    </Link>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      </section>

      <section className="mx-auto max-w-[1320px] px-4 pb-16 sm:px-6">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {features.map(({ Icon, title, body }) => (
            <div key={title} className="rounded-2xl border border-zinc-200 bg-white p-6">
              <Icon className="size-7 text-blue-600" />
              <div className="mt-4 font-semibold">{title}</div>
              <p className="mt-2 text-sm leading-6 text-zinc-500">{body}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-[1320px] px-4 pb-20 sm:px-6">
        <div className="grid items-center gap-6 rounded-3xl border border-zinc-200 bg-white p-6 lg:grid-cols-2 lg:p-10">
          <div>
            <div className="mb-3 flex items-center gap-2"><Chip>同源 VisualSpec</Chip><Chip>n8n / 后端可用</Chip></div>
            <h2 className="text-3xl font-semibold tracking-tight">页面与 API，同一份能力</h2>
            <p className="mt-3 text-zinc-500">设计师在编辑器里调好模板，后端、n8n 或定时任务用同一份 JSON 调用 <code className="rounded bg-zinc-100 px-1.5 py-0.5 text-sm">/api/v1/render</code>，即可自动产出图片素材，驱动社媒内容生产。</p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link href="/editor" className="inline-flex items-center gap-1.5 rounded-full bg-blue-600 px-6 py-3 text-sm font-semibold text-white transition hover:bg-blue-700">进入编辑器 <ArrowUpRight className="size-4" /></Link>
              <Link href="/playground" className="inline-flex items-center gap-1.5 rounded-full border border-zinc-200 px-6 py-3 text-sm font-semibold transition hover:bg-zinc-50"><FileJson className="size-4" /> API 调试台</Link>
            </div>
          </div>
          <pre className="overflow-x-auto rounded-2xl bg-zinc-950 p-5 text-xs leading-6 text-zinc-100">{`POST /api/v1/render
{
  "title": "销售表现",
  "visual": { "type": "bar", "story": "magnitude" },
  "data": [
    { "month": "2026-01", "value": 29 },
    { "month": "2026-02", "value": 52 }
  ],
  "palette": ${JSON.stringify(palette.slice(0, 3))},
  "export": { "format": "png", "target": "xiaohongshu" }
}`}</pre>
        </div>
      </section>

      <footer className="border-t border-zinc-200 py-8">
        <div className="mx-auto flex max-w-[1320px] flex-wrap items-center justify-between gap-3 px-4 text-sm text-zinc-500 sm:px-6">
          <div className="flex items-center gap-2 font-semibold text-zinc-700"><ChartNoAxesCombined className="size-5 text-blue-600" /> VizForge Motion</div>
          <div>把数据锻造成可发布的视觉素材。</div>
        </div>
      </footer>

      <Toast toast={toast} />
    </main>
  );
}
