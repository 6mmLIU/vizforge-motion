import { ArrowLeft, BookOpen, ShieldCheck, TerminalSquare } from "lucide-react";
import Link from "next/link";

const sections = [
  {
    title: "VisualSpec 数据契约",
    body: "渲染器只接受结构化 JSON：标题、卡片元数据、图表类型、数据行、字段映射、色卡、动画和导出配置。用户输入不会被当作 HTML、JS 或任意 SVG 执行。"
  },
  {
    title: "数据决定图形数量",
    body: "图形项数由 data.rows 或聚合后的分类数量决定，不由模板固定。柱状、横向条形、圆环、玫瑰、雷达、指标 spark 和日历热力图都会按当前数据渲染；不会再套 12/24/30 这样的模板限制。"
  },
  {
    title: "自动色卡匹配",
    body: "palette 是种子色，不必一次传满。系统会按当前图形项数自动裁剪或延展色卡，并在 API JSON 中返回实际使用的 palette，方便设计师和工作流复用。"
  },
  {
    title: "API 解析结果可追踪",
    body: "JSON 响应会返回 meta：包含系统实际采用的 visual、mappings、rowCount、dataItemCount、renderedItemCount 和导出尺寸。设计师、后端和 n8n 可以直接读取它，确认本次图形是按哪些字段和多少个数据项生成的。"
  },
  {
    title: "字段自动推荐",
    body: "如果 API 请求没有传 mappings，系统会根据当前数据重新推荐分类、时间、数值和系列字段。比如有唯一 month 和重复 channel 的柱状图会优先用 month 做轴；构成类图会优先用 channel 聚合。"
  },
  {
    title: "卡片自适应规则",
    body: "卡片里的周期、指标、趋势、前后缀都是可选配置。periodLabel 为空就不显示周期胶囊；metric 缺 label 或 value 就跳过这一项；trend 为空就不显示箭头和趋势文字。"
  },
  {
    title: "动态 SVG 导出",
    body: "动画使用纯 SVG 元素和 SMIL animate / animateTransform，不依赖 JavaScript，适合复制到公众号图文或作为自动化素材。"
  },
  {
    title: "微信安全模式",
    body: "安全检测会拦截 script、foreignObject、iframe、事件处理器、外链资源、base64 图片和不安全动画属性，并输出兼容性评分。"
  },
  {
    title: "静态图片导出",
    body: "API 会先生成同一份 SVG，再在服务端转换成 PNG、WebP 或 JPEG，保证网页预览、SVG 动画和图片输出的视觉一致。"
  },
  {
    title: "面积趋势与系列字段",
    body: "area 图会优先按 x/y 渲染时间趋势；如果传入稳定的 series 字段，会显示双系列面积。series 数据不完整时会自动聚合成单面积，避免线条断裂。"
  },
  {
    title: "横向条形排行",
    body: "horizontal-bar 适合分类排行。每一行数据对应一条横向柱；story 为 ranking 时会按数值从高到低排列，标签、数值和条形长度都会按当前数据自适应。"
  },
  {
    title: "Token 活动热力图",
    body: "heatmap 支持 date/value 形式的日历活动图。传 30 天就渲染 30 天附近的周网格，传一年就渲染一年；月份标签由日期字段自动推导，适合 Token 活动、签到、提交频次和内容发布节奏。"
  },
  {
    title: "指标卡数据来源",
    body: "metric-card 的主数值来自 card.metrics[0] 或第一行数据，小柱图来自 data.rows。没有 periodLabel、trend 或辅助 metric 时，对应组件不会显示。"
  },
  {
    title: "自动化边界",
    body: "适合 Java 后端、n8n、公众号排版和报告生成工作流。接口返回 SVG、图片 Data URL、base64 和兼容性检测结果。"
  }
];

const payload = `{
  "title": "销售表",
  "visual": { "type": "bar", "story": "magnitude" },
  "data": [
    { "month": "2026-01", "value": 29, "channel": "自然流量" },
    { "month": "2026-02", "value": 52, "channel": "自然流量" },
    { "month": "2026-03", "value": 34, "channel": "自然流量" },
    { "month": "2026-04", "value": 16, "channel": "自然流量" }
  ],
  "card": {
    "periodLabel": "最近 2 周",
    "metrics": [
      { "label": "周销售额", "value": "28,441", "prefix": "$", "delta": "3.3%", "trend": "" },
      { "label": "日销售额", "value": "4,063", "prefix": "$", "delta": "3.3%", "trend": "up" },
      { "label": "总销量", "value": 278, "delta": "3.3%", "trend": "up" }
    ]
  },
  "palette": ["#2563eb", "#14b8a6", "#f97316", "#8b5cf6"],
  "export": { "format": "json", "target": "xiaohongshu" }
}`;

const responseMeta = `{
  "palette": ["#2563eb", "#14b8a6", "..."],
  "meta": {
    "visual": { "type": "bar", "story": "magnitude" },
    "mappings": { "category": "month", "value": "value", "x": "month", "y": "value" },
    "rowCount": 12,
    "dataItemCount": 12,
    "itemCount": 12,
    "renderedItemCount": 12,
    "export": { "format": "json", "width": 1080, "height": 1440, "wechatSafeMode": true }
  },
  "assets": {
    "svg": "<svg ...>",
    "imageDataUrl": "data:image/png;base64,..."
  }
}`;

export default function DocsPage() {
  return (
    <main className="min-h-screen bg-[#f7f7f8] text-zinc-950">
      <header className="flex items-center gap-3 border-b border-zinc-200 bg-white px-5 py-4">
        <Link href="/" className="grid h-9 w-9 place-items-center rounded-full bg-zinc-100 transition hover:bg-zinc-200">
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div>
          <div className="text-sm font-semibold text-zinc-950">文档</div>
          <div className="text-xs text-zinc-500">VisualSpec、导出格式、安全模式和 API 示例。</div>
        </div>
      </header>

      <div className="mx-auto grid max-w-6xl gap-6 px-6 py-10 lg:grid-cols-[0.9fr_1.1fr]">
        <section>
          <div className="mb-6 inline-flex items-center gap-2 rounded-full bg-blue-50 px-3 py-1 text-sm font-semibold text-blue-700">
            <BookOpen className="h-4 w-4" />
            开发者契约
          </div>
          <h1 className="text-5xl font-semibold leading-tight text-zinc-950">用一个 JSON 生成动态图表素材。</h1>
          <p className="mt-5 text-lg leading-8 text-zinc-500">
            VizForge Motion 把 CSV、JSON 和表格数据转换成设计完成度更高的图表卡片、微信公众号动态 SVG 和可自动化提取的图片 assets。
          </p>
          <div className="mt-8 grid gap-4">
            {sections.map((section) => (
              <div key={section.title} className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-[0_2px_12px_rgba(0,0,0,0.04)]">
                <h2 className="text-lg font-semibold text-zinc-950">{section.title}</h2>
                <p className="mt-2 text-sm leading-6 text-zinc-500">{section.body}</p>
              </div>
            ))}
          </div>
        </section>

        <aside className="space-y-4">
          <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-[0_2px_12px_rgba(0,0,0,0.04)]">
            <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-zinc-700">
              <TerminalSquare className="h-4 w-4 text-blue-500" />
              渲染请求
            </div>
            <pre className="overflow-x-auto rounded-xl bg-zinc-950 p-4 text-sm leading-6 text-zinc-100">{payload}</pre>
          </div>
          <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-[0_2px_12px_rgba(0,0,0,0.04)]">
            <div className="mb-3 text-sm font-semibold text-zinc-700">card 字段怎么用</div>
            <div className="grid gap-2 text-sm text-zinc-600">
              {[
                "periodLabel：周期胶囊文字。传空字符串、null 或不传，整个胶囊不显示；它不是下拉按钮，不会画箭头。",
                "metrics：最多 4 个指标。每个指标必须有 label 和 value，否则这一项会被自动跳过。",
                "prefix / suffix：数值前后缀，例如 $、% 或 人。",
                "delta + trend：只有 trend 为 up、down 或 neutral 时才显示趋势组件；trend 为空时不会默认补箭头。",
                "如果整个 card 不传，渲染器会自动把图表区域上移，不保留空白 KPI 区。"
              ].map((line) => (
                <div key={line} className="rounded-xl bg-zinc-50 px-3 py-2">
                  {line}
                </div>
              ))}
            </div>
          </div>
          <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-[0_2px_12px_rgba(0,0,0,0.04)]">
            <div className="mb-3 text-sm font-semibold text-zinc-700">响应里怎么看实际渲染结果</div>
            <pre className="overflow-x-auto rounded-xl bg-zinc-950 p-4 text-sm leading-6 text-zinc-100">{responseMeta}</pre>
          </div>
          <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-[0_2px_12px_rgba(0,0,0,0.04)]">
            <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-zinc-700">
              <ShieldCheck className="h-4 w-4 text-emerald-500" />
              当前限制
            </div>
            <div className="grid gap-2 text-sm text-zinc-600">
              {[
                "请求体上限：512KB。",
                "结构化数据：最多 5000 行。",
                "动态图形项：多数图表最多渲染前 200 项；heatmap 最多 400 项，适合一年日历活动数据。",
                "柱状/横向条形：一行数据对应一根柱或一条，不再固定 12 根。",
                "圆环/玫瑰/矩形树图：按分类聚合后渲染，分类有多少项就显示多少项。",
                "色卡：输入的是种子色，响应里的 palette 才是本次实际使用的完整色卡。",
                "默认导出：动态 SVG，同时 JSON 可包含图片 Data URL。"
              ].map((line) => (
                <div key={line} className="rounded-xl bg-zinc-50 px-3 py-2">
                  {line}
                </div>
              ))}
            </div>
          </div>
        </aside>
      </div>
    </main>
  );
}
