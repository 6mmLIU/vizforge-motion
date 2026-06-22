"use client";

import { renderAnimatedSvg } from "@/lib/motion/animatedSvgRenderer";
import { DEFAULT_VISUAL_SPEC, type MotionPreset, type VisualStory, type VisualType } from "@/lib/visual/visualSpec";
import {
  ArrowUpRight,
  BarChart3,
  ChartNoAxesCombined,
  ChevronDown,
  Code2,
  FileJson,
  Github,
  Home,
  LayoutDashboard,
  Palette,
  Settings,
  ShieldCheck,
  Sparkles,
  Table2,
  Wand2
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";

const nav = [
  { label: "文档", href: "/docs" },
  { label: "编辑器", href: "/editor" },
  { label: "API", href: "/playground" },
  { label: "组件", href: "#components" }
];

const tabs = ["总览", "模板", "组件", "API", "色卡"] as const;

const palettePresets = [
  { name: "Hero 蓝", colors: ["#0a84ff", "#38bdf8", "#22c55e", "#f59e0b", "#f472b6"] },
  { name: "极光科技", colors: ["#30f6ff", "#a855f7", "#36d399", "#f8d66d", "#ff7ab6"] },
  { name: "内容传播", colors: ["#2563eb", "#ec4899", "#f97316", "#10b981", "#8b5cf6"] },
  { name: "报告克制", colors: ["#111827", "#475569", "#0ea5e9", "#14b8a6", "#f59e0b"] }
];

const metrics = [
  { label: "动态 SVG", value: "26", delta: "图形" },
  { label: "微信安全", value: "96", delta: "评分" },
  { label: "图片导出", value: "4", delta: "格式" },
  { label: "API 调用", value: "1", delta: "接口" }
];

const dashboardNav: Array<{ Icon: LucideIcon; label: string; active?: boolean; badge?: string; tab: (typeof tabs)[number] }> = [
  { Icon: LayoutDashboard, label: "工作台", active: true, tab: "总览" },
  { Icon: Table2, label: "数据输入", tab: "模板" },
  { Icon: BarChart3, label: "动态图形", badge: "重点", tab: "组件" },
  { Icon: Code2, label: "API 生成", tab: "API" },
  { Icon: Settings, label: "主题色卡", tab: "色卡" }
];

const workflow: Array<{ Icon: LucideIcon; title: string; body: string }> = [
  { Icon: FileJson, title: "粘贴数据", body: "CSV、JSON、Markdown 表格会自动识别字段。" },
  { Icon: Sparkles, title: "套用模板", body: "生成公众号、PPT、报告和社媒图表卡片。" },
  { Icon: ShieldCheck, title: "导出发布", body: "复制动态 SVG，或下载 PNG、WebP、JPEG。" }
];

const chartTypes = [
  ["比较类", "柱状图", "横向排行榜", "堆叠图", "分组柱状图", "瀑布图"],
  ["时间类", "折线图", "面积图", "时间线", "动态排行", "排名变化"],
  ["构成类", "环形图", "饼图", "玫瑰图", "矩形树图", "旭日图"],
  ["关系类", "散点图", "气泡图", "网络图", "相关矩阵"],
  ["自动化", "SVG 代码", "PNG 数据 URL", "n8n 调用", "Java 后端"]
];

const miniShowcase: Array<{ title: string; type: VisualType; story: VisualStory; motion: MotionPreset; note: string }> = [
  { title: "柱状图生长", type: "bar", story: "magnitude", motion: "grow", note: "从底部优雅生长，适合增长和对比" },
  { title: "环形图扫出", type: "donut", story: "part-to-whole", motion: "sweep", note: "顺时针揭示占比，适合渠道构成" },
  { title: "折线图绘制", type: "line", story: "change-over-time", motion: "draw", note: "从左到右讲述趋势，适合时间序列" },
  { title: "玫瑰图绽放", type: "rose", story: "part-to-whole", motion: "bloom", note: "花瓣展开，适合内容传播配图" }
];

const componentRows = [
  { channel: "公众号", value: 42, month: "2026-01" },
  { channel: "小红书", value: 31, month: "2026-02" },
  { channel: "搜索", value: 24, month: "2026-03" },
  { channel: "社群", value: 18, month: "2026-04" },
  { channel: "广告", value: 15, month: "2026-05" }
];

function svgFor(type: VisualType, story: VisualStory, motion: MotionPreset, palette: string[]) {
  const rows = type === "bar" || type === "line" ? DEFAULT_VISUAL_SPEC.data.rows : componentRows;
  return renderAnimatedSvg({
    ...DEFAULT_VISUAL_SPEC,
    title: type === "rose" ? "渠道构成" : type === "donut" ? "增长来源" : type === "line" ? "月度趋势" : "销售表现",
    subtitle: undefined,
    type,
    story,
    palette,
    data: { rows },
    mappings: type === "bar" || type === "line" ? { category: "month", value: "value", x: "month", y: "value" } : { category: "channel", value: "value" },
    export: { ...DEFAULT_VISUAL_SPEC.export, width: 720, height: 500 },
    motion: {
      ...DEFAULT_VISUAL_SPEC.motion,
      preset: motion
    }
  }).svg;
}

function Pill({ children, active = false, onClick }: { children: React.ReactNode; active?: boolean; onClick?: () => void }) {
  return (
    <button onClick={onClick} className={`rounded-full px-5 py-2 text-sm font-medium transition ${active ? "bg-white text-zinc-950 shadow-sm" : "text-zinc-500 hover:text-zinc-950"}`}>
      {children}
    </button>
  );
}

function Chip({ children }: { children: React.ReactNode }) {
  return <span className="rounded-full bg-zinc-100 px-3 py-1.5 text-sm font-semibold text-zinc-600">{children}</span>;
}

function IconButton({ children, label, onClick }: { children: React.ReactNode; label: string; onClick?: () => void }) {
  return (
    <button onClick={onClick} aria-label={label} className="grid size-11 place-items-center rounded-full bg-zinc-100 text-zinc-700 transition hover:bg-zinc-200">
      {children}
    </button>
  );
}

function MetricCard({ label, value, delta }: { label: string; value: string; delta: string }) {
  return (
    <button className="min-w-0 overflow-hidden rounded-2xl border border-zinc-200 bg-white p-5 text-left shadow-[0_2px_10px_rgba(0,0,0,0.04)] transition hover:-translate-y-0.5 hover:shadow-[0_10px_28px_rgba(0,0,0,0.08)]">
      <div className="text-sm text-zinc-500">{label}</div>
      <div className="mt-5 flex flex-wrap items-end justify-between gap-3">
        <div className="min-w-0 text-3xl font-semibold tracking-normal text-zinc-950">{value}</div>
        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-semibold text-emerald-700">
          <ArrowUpRight className="size-3" />
          {delta}
        </span>
      </div>
    </button>
  );
}

function SalesBars({ accent }: { accent: string }) {
  const values = [29, 52, 34, 16, 43, 23, 25, 30, 10, 43, 37, 31];
  return (
    <div className="min-w-0 overflow-hidden rounded-2xl border border-zinc-200 bg-white p-5 shadow-[0_2px_12px_rgba(0,0,0,0.05)] sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <h3 className="text-xl font-semibold text-zinc-950">销售表现</h3>
          <div className="mt-5 grid gap-5 sm:grid-cols-3">
            {[
              ["$28,441", "周销售额"],
              ["$4,063", "日销售额"],
              ["278", "总销量"]
            ].map(([value, label]) => (
              <div key={label}>
                <div className="text-2xl font-semibold">{value} <span className="text-sm text-emerald-600">↑ 3.3%</span></div>
                <div className="text-sm text-zinc-500">{label}</div>
              </div>
            ))}
          </div>
        </div>
        <span className="inline-flex items-center gap-2 rounded-2xl bg-zinc-100 px-4 py-2 text-sm font-semibold text-zinc-700">
          最近 2 周
          <ChevronDown className="size-4" />
        </span>
      </div>
      <div className="mt-8 grid h-56 grid-cols-12 items-end gap-3 border-b border-zinc-200 px-4">
        {values.map((value, index) => (
          <div key={index} className="flex min-w-0 flex-col items-center gap-3">
            <div className="w-full max-w-7 rounded-full" style={{ height: `${value * 3.2}px`, backgroundColor: accent }} />
            <div className="text-xs text-zinc-500">{String(index + 1).padStart(2, "0")}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function DashboardPreview({ activeTab, setActiveTab, palette }: { activeTab: (typeof tabs)[number]; setActiveTab: (tab: (typeof tabs)[number]) => void; palette: string[] }) {
  return (
    <div className="mx-auto w-full min-w-0 max-w-[1700px] overflow-hidden rounded-[28px] border border-zinc-200 bg-zinc-50 shadow-[0_20px_60px_rgba(0,0,0,0.08)]">
      <div className="grid min-h-[560px] grid-cols-1 lg:min-h-[720px] lg:grid-cols-[280px_1fr] xl:grid-cols-[320px_1fr]">
        <aside className="hidden border-r border-zinc-200 bg-white p-7 lg:block">
          <div className="mb-9 flex items-center gap-4">
            <div className="size-12 rounded-full" style={{ background: `linear-gradient(135deg, ${palette[1] ?? palette[0]}, ${palette[0]})` }} />
            <div>
              <div className="font-semibold text-zinc-950">VizForge Motion</div>
              <div className="text-sm text-zinc-500">数据视觉锻造器</div>
            </div>
          </div>
          {dashboardNav.map(({ Icon, label, badge, tab }) => (
            <button key={label} onClick={() => setActiveTab(tab)} className={`mb-2 flex w-full items-center gap-4 rounded-2xl px-4 py-3 text-left text-lg transition ${activeTab === tab ? "bg-zinc-100 font-semibold text-zinc-950" : "text-zinc-700 hover:bg-zinc-50"}`}>
              <Icon className="size-5" />
              {label}
              {badge && <span className="ml-auto rounded-full bg-emerald-100 px-3 py-1 text-sm text-emerald-700">{badge}</span>}
            </button>
          ))}
        </aside>
        <section className="min-w-0 p-4 sm:p-6 lg:p-8">
          <div className="mb-6 flex flex-wrap items-center justify-between gap-4 lg:mb-8">
            <div className="flex items-center gap-4">
              <IconButton label="回到总览" onClick={() => setActiveTab("总览")}><Home className="size-5" /></IconButton>
              <div>
                <h3 className="text-xl font-semibold text-zinc-950 sm:text-2xl">工作台预览</h3>
                <p className="mt-1 text-sm text-zinc-500">面向公众号、PPT、报告、n8n 和后端自动化调用。</p>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Chip>微信安全</Chip>
              <Chip>API Ready</Chip>
            </div>
          </div>

          <div className="mb-7 flex flex-wrap items-center justify-between gap-4">
            <div className="max-w-full overflow-x-auto rounded-full bg-zinc-100 p-1">
              {tabs.slice(0, 4).map((tab) => <Pill key={tab} active={activeTab === tab} onClick={() => setActiveTab(tab)}>{tab}</Pill>)}
            </div>
            <span className="max-w-full text-sm font-medium text-zinc-500">预览区仅展示产品工作台，主要操作从顶部入口开始。</span>
          </div>

          <div className="mb-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {metrics.map((metric) => <MetricCard key={metric.label} {...metric} />)}
          </div>
          <div className="grid min-w-0 gap-5 xl:grid-cols-[1.1fr_0.9fr]">
            <SalesBars accent={palette[0]} />
            <div className="min-w-0 overflow-hidden rounded-2xl border border-zinc-200 bg-white p-5 shadow-[0_2px_12px_rgba(0,0,0,0.05)] sm:p-6">
              <div className="mb-5 flex items-center justify-between">
                <div>
                  <h3 className="text-xl font-semibold text-zinc-950">API 返回内容</h3>
                  <p className="text-sm text-zinc-500">同一次请求返回 SVG、图片 Data URL 和兼容性检测。</p>
                </div>
                <Code2 className="size-5 text-zinc-500" />
              </div>
              <pre className="overflow-x-auto rounded-xl bg-zinc-950 p-4 text-xs leading-6 text-zinc-100">{`POST /api/v1/render
{
  "visual": { "type": "bar" },
  "palette": ${JSON.stringify(palette.slice(0, 3))},
  "export": { "format": "png" }
}`}</pre>
              <div className="mt-5 grid grid-cols-3 gap-2 text-center text-sm">
                {["SVG", "PNG", "JSON"].map((item) => <span key={item} className="rounded-full bg-zinc-100 px-3 py-2 font-semibold text-zinc-700">{item}</span>)}
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}

export default function HomePage() {
  const [activeTab, setActiveTab] = useState<(typeof tabs)[number]>("总览");
  const [palette, setPalette] = useState(palettePresets[0].colors);
  const showcase = useMemo(() => miniShowcase.map((item) => ({ ...item, svg: svgFor(item.type, item.story, item.motion, palette) })), [palette]);

  return (
    <main className="min-h-screen overflow-x-hidden bg-[#f7f7f8] text-zinc-950">
      <header className="sticky top-0 z-40 border-b border-zinc-200/70 bg-[#f7f7f8]/90 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-[1840px] items-center justify-between px-4 sm:px-6">
          <Link href="/" className="flex items-center gap-3 text-2xl font-bold tracking-normal sm:text-3xl">
            <ChartNoAxesCombined className="size-8 text-zinc-950" />
            VizForge
          </Link>
          <nav className="hidden items-center gap-6 text-sm font-semibold text-zinc-600 md:flex">
            {nav.map((item) => <Link key={item.label} href={item.href} className="transition hover:text-zinc-950">{item.label}</Link>)}
          </nav>
          <div className="flex items-center gap-2 sm:gap-3">
            <Link href="/playground" className="hidden h-11 items-center gap-2 rounded-full bg-zinc-100 px-4 text-sm font-semibold text-zinc-700 transition hover:bg-zinc-200 lg:flex">
              <Code2 className="size-4" />
              API 调试台
            </Link>
            <Link href="/playground" aria-label="API 调试台" className="grid size-11 place-items-center rounded-full bg-zinc-100 text-zinc-700 transition hover:bg-zinc-200 lg:hidden"><Code2 className="size-5" /></Link>
            <Link href="/docs" aria-label="GitHub 与文档" className="grid size-11 place-items-center rounded-full bg-zinc-100 text-zinc-700 transition hover:bg-zinc-200"><Github className="size-5" /></Link>
          </div>
        </div>
      </header>

      <section className="mx-auto max-w-[1840px] px-4 pb-12 pt-10 sm:px-6">
        <div className="mx-auto mb-8 max-w-5xl text-center">
          <div className="mb-5 inline-flex max-w-full items-center justify-center gap-2 rounded-2xl bg-blue-50 px-3 py-2 text-center text-sm font-semibold leading-5 text-blue-700 sm:rounded-full sm:px-4">
            <Wand2 className="size-4" />
            <span>高级数据可视化图片与动态 SVG 生成平台</span>
          </div>
          <h1 className="text-balance text-3xl font-semibold leading-tight tracking-normal text-zinc-950 sm:text-4xl md:text-5xl">
            <span className="block sm:inline">把原始数据变成</span>
            <span className="block sm:inline">高级图表图片</span>
            <span className="block sm:inline">和公众号动态 SVG。</span>
          </h1>
          <p className="mx-auto mt-5 max-w-3xl break-words text-base leading-7 text-zinc-500 sm:text-lg sm:leading-8">
            <span className="sm:hidden">更适合内容传播和自动化调用。</span>
            <span className="hidden sm:inline">更适合内容传播和自动化调用的 Flourish + QuickChart 替代品。</span>
            输入 CSV、JSON 或表格数据，一键生成可发布、可下载、可通过 API 获取的图表素材。
          </p>
          <div className="mt-7 flex flex-wrap justify-center gap-3">
            <Link href="/editor" className="rounded-full px-7 py-3 text-lg font-semibold text-white shadow-sm transition hover:opacity-90" style={{ backgroundColor: palette[0] }}>开始生成</Link>
            <Link href="/playground" className="rounded-full border border-zinc-200 bg-white px-7 py-3 text-lg font-semibold shadow-sm transition hover:bg-zinc-50">API 调用</Link>
          </div>
        </div>

        <div className="mb-6 hidden items-center justify-between gap-5 px-2 lg:flex">
          <div className="rounded-full bg-zinc-100 p-1">
            {tabs.map((tab) => <Pill key={tab} active={activeTab === tab} onClick={() => setActiveTab(tab)}>{tab}</Pill>)}
          </div>
          <div className="flex flex-wrap items-center gap-3 text-zinc-500">
            <span className="hidden text-lg md:inline">点击色卡改变预览和 API palette</span>
            {palettePresets.map((preset) => (
              <button key={preset.name} onClick={() => setPalette(preset.colors)} className={`flex items-center gap-1 rounded-full border px-2 py-1 transition ${palette[0] === preset.colors[0] ? "border-zinc-950 bg-white" : "border-transparent hover:bg-white"}`}>
                {preset.colors.slice(0, 4).map((color) => <span key={color} className="size-6 rounded-full" style={{ backgroundColor: color }} />)}
              </button>
            ))}
            <Palette className="size-5" />
          </div>
        </div>

        <DashboardPreview activeTab={activeTab} setActiveTab={setActiveTab} palette={palette} />
      </section>

      <section id="components" className="mx-auto max-w-[1840px] px-6 py-14">
        <div className="mb-7 flex flex-wrap items-end justify-between gap-4">
          <div>
            <h2 className="text-3xl font-semibold tracking-normal">动态图表组件</h2>
            <p className="mt-2 text-lg text-zinc-500">每个组件都由同一份 VisualSpec 驱动，适合复制进公众号或通过 API 输出图片。</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Chip>动画 SVG</Chip>
            <Chip>API assets</Chip>
          </div>
        </div>
        <div className="grid gap-5 lg:grid-cols-2">
          {showcase.map((item) => (
            <article key={item.title} className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-[0_2px_12px_rgba(0,0,0,0.04)]">
              <div className="mb-4 flex items-center justify-between gap-4">
                <div>
                  <h3 className="text-lg font-semibold">{item.title}</h3>
                  <p className="text-sm text-zinc-500">{item.note}</p>
                </div>
                <span className="rounded-full bg-zinc-100 px-3 py-1.5 text-xs font-semibold uppercase tracking-normal text-zinc-600">{item.type}</span>
              </div>
              <div className="svg-card-preview rounded-xl border border-zinc-200 bg-zinc-50 p-3" dangerouslySetInnerHTML={{ __html: item.svg }} />
            </article>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-[1840px] px-6 pb-20">
        <div className="grid gap-5 lg:grid-cols-[0.9fr_1.1fr]">
          <div className="rounded-2xl border border-zinc-200 bg-white p-6">
            <h2 className="text-2xl font-semibold">图表类型按数据故事组织</h2>
            <p className="mt-2 text-zinc-500">不是让用户写配置，而是按传播场景和数据故事选择模板。</p>
            <div className="mt-6 grid gap-3">
              {chartTypes.map(([title, ...items]) => (
                <div key={title} className="rounded-xl bg-zinc-50 p-4">
                  <div className="mb-3 font-semibold">{title}</div>
                  <div className="flex flex-wrap gap-2">
                    {items.map((item) => <span key={item} className="rounded-full bg-white px-3 py-1 text-sm text-zinc-600 shadow-sm">{item}</span>)}
                  </div>
                </div>
              ))}
            </div>
            <Link href="/editor" className="mt-5 inline-flex items-center gap-1 text-sm font-semibold text-zinc-700 transition hover:text-zinc-950" style={{ color: palette[0] }}>
              在编辑器里挑模板 <ArrowUpRight className="size-4" />
            </Link>
          </div>
          <div className="rounded-2xl border border-zinc-200 bg-white p-6">
            <div className="mb-5 flex items-center justify-between gap-4">
              <div>
                <h2 className="text-2xl font-semibold">从页面到 API 是同一份能力</h2>
                <p className="text-zinc-500">设计师在编辑器里调模板，后端和 n8n 用同一份 JSON 调接口。</p>
              </div>
              <Chip>同源 VisualSpec</Chip>
            </div>
            <ol className="grid gap-4 md:grid-cols-3">
              {workflow.map(({ Icon, title, body }, index) => (
                <li key={title} className="rounded-xl bg-zinc-50 p-5">
                  <div className="mb-5 flex items-center gap-3">
                    <Icon className="size-6" style={{ color: palette[0] }} />
                    <span className="text-xs font-semibold uppercase tracking-wider text-zinc-400">{`0${index + 1}`}</span>
                  </div>
                  <div className="font-semibold">{title}</div>
                  <p className="mt-2 text-sm text-zinc-500">{body}</p>
                </li>
              ))}
            </ol>
            <pre className="mt-5 overflow-x-auto rounded-xl bg-zinc-950 p-4 text-xs leading-6 text-zinc-100">{`{
  "title": "销售表现",
  "visual": { "type": "bar", "story": "magnitude" },
  "data": [{ "month": "Jan", "value": 12000 }],
  "palette": ${JSON.stringify(palette.slice(0, 4))},
  "export": { "format": "animated-svg", "target": "wechat" }
}`}</pre>
          </div>
        </div>
      </section>
    </main>
  );
}
