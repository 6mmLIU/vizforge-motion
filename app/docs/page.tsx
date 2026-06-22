import { ArrowLeft, BookOpen, Braces, CheckCircle2, FileJson, Gauge, ImageDown, Layers3, Search, ShieldCheck, TerminalSquare } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";

const sidebarGroups = [
  {
    title: "开始",
    links: [
      { label: "概览", href: "#overview" },
      { label: "快速请求", href: "#quickstart" },
      { label: "请求结构", href: "#request" }
    ]
  },
  {
    title: "API",
    links: [
      { label: "渲染端点", href: "#endpoint" },
      { label: "高清导出", href: "#quality" },
      { label: "响应字段", href: "#response" }
    ]
  },
  {
    title: "生产使用",
    links: [
      { label: "微信安全", href: "#wechat" },
      { label: "错误处理", href: "#errors" },
      { label: "限制", href: "#limits" }
    ]
  }
] as const;

const pageOutline = [
  { label: "概览", href: "#overview" },
  { label: "请求示例", href: "#quickstart" },
  { label: "VisualSpec", href: "#request" },
  { label: "高清 PNG", href: "#quality" },
  { label: "响应", href: "#response" },
  { label: "错误", href: "#errors" }
] as const;

const requestPayload = `{
  "title": "销售表现",
  "subtitle": "最近周期销售数据",
  "visual": { "type": "bar", "story": "magnitude" },
  "data": [
    { "month": "2026-01", "value": 29, "channel": "自然流量" },
    { "month": "2026-02", "value": 52, "channel": "付费广告" },
    { "month": "2026-03", "value": 34, "channel": "公众号" },
    { "month": "2026-04", "value": 16, "channel": "小红书" }
  ],
  "card": {
    "periodLabel": "最近 2 周",
    "metrics": [
      { "label": "周销售额", "value": "28,441", "prefix": "$", "delta": "3.3%", "trend": "up" },
      { "label": "日销售额", "value": "4,063", "prefix": "$", "delta": "3.3%", "trend": "up" }
    ]
  },
  "palette": ["#2f63d8", "#16a394", "#f06a3f", "#7b61ff"],
  "export": {
    "format": "json",
    "target": "xiaohongshu",
    "pixelRatio": 2
  }
}`;

const curlExample = `curl -X POST https://vizforge-motion.vercel.app/api/v1/render \\
  -H "content-type: application/json" \\
  -H "accept: application/json" \\
  -d '${requestPayload.replaceAll("\n", "").replaceAll("  ", "")}'`;

const directPngExample = `curl -X POST https://vizforge-motion.vercel.app/api/v1/render \\
  -H "content-type: application/json" \\
  -H "accept: image/png" \\
  -o chart@2x.png \\
  -d '{
    "title": "销售表现",
    "visual": { "type": "bar", "story": "magnitude" },
    "data": [{ "month": "2026-01", "value": 29 }],
    "export": { "target": "xiaohongshu", "pixelRatio": 2 }
  }'`;

const responseExample = `{
  "assets": {
    "svg": "<svg ...>",
    "imageDataUrl": "data:image/png;base64,...",
    "imageContentType": "image/png",
    "imageFormat": "png",
    "width": 2160,
    "height": 2880,
    "pixelRatio": 2,
    "layoutWidth": 1080,
    "layoutHeight": 1440,
    "palette": ["#2f63d8", "#16a394", "..."]
  },
  "meta": {
    "visual": { "type": "bar", "story": "magnitude" },
    "mappings": { "category": "month", "value": "value" },
    "rowCount": 12,
    "dataItemCount": 12,
    "renderedItemCount": 12,
    "export": {
      "format": "json",
      "width": 1080,
      "height": 1440,
      "pixelRatio": 2,
      "wechatSafeMode": true
    }
  }
}`;

const fieldRows = [
  ["title", "string", "主标题。建议控制在 4-12 个中文字符，社媒封面更醒目。"],
  ["subtitle", "string", "副标题或解释句。为空时不占位。"],
  ["visual.type", "enum", "bar、line、area、donut、rose、heatmap、metric-card 等图形类型。"],
  ["visual.story", "enum", "magnitude、trend、composition、ranking、distribution、flow 等叙事方式。"],
  ["data", "array/object", "可以直接传数组，也可以传 { rows: [...] }。"],
  ["card.metrics", "array", "KPI 卡片数据。缺 label 或 value 的项会被跳过。"],
  ["palette", "hex[]", "种子色。系统会按数据项自动扩展，响应会返回实际色卡。"],
  ["export.target", "string", "xiaohongshu 会生成 1080x1440 布局；poster/highres 会生成横向高清布局。"],
  ["export.pixelRatio", "number", "图片像素倍率，1-3。小红书/公众号建议 2。"]
] as const;

const limitRows = [
  ["请求体", "512KB"],
  ["数据行", "最多 5000 行"],
  ["常规图形渲染项", "最多 200 项"],
  ["heatmap 渲染项", "最多 400 项"],
  ["export.width", "320-2400"],
  ["export.height", "240-1800"],
  ["export.pixelRatio", "1-3"]
] as const;

const errorRows = [
  ["400", "请求体不是合法 JSON，或 VisualSpec 字段不符合 schema。"],
  ["413", "请求体超过 512KB。"],
  ["501", "请求了暂未支持的 static-svg。"],
  ["500", "渲染器内部失败，响应里会返回安全错误信息。"]
] as const;

function CodeBlock({ title, badge, code }: { title: string; badge: string; code: string }) {
  return (
    <div className="overflow-hidden rounded-lg border border-zinc-200 bg-white">
      <div className="flex items-center justify-between gap-3 border-b border-zinc-200 bg-zinc-50 px-4 py-2.5">
        <div className="min-w-0 truncate text-sm font-semibold text-zinc-800">{title}</div>
        <div className="shrink-0 rounded-md bg-white px-2 py-1 font-mono text-xs text-zinc-500 shadow-sm">{badge}</div>
      </div>
      <pre className="overflow-x-auto bg-zinc-950 p-4 text-[13px] leading-6 text-zinc-100">
        <code>{code}</code>
      </pre>
    </div>
  );
}

function SectionHeader({ id, eyebrow, title, children }: { id: string; eyebrow: string; title: string; children: ReactNode }) {
  return (
    <section id={id} className="scroll-mt-24 border-b border-zinc-200 py-10">
      <div className="mb-3 text-sm font-semibold text-blue-600">{eyebrow}</div>
      <h2 className="text-2xl font-semibold tracking-normal text-zinc-950">{title}</h2>
      <div className="mt-3 max-w-3xl text-[15px] leading-7 text-zinc-600">{children}</div>
    </section>
  );
}

export default function DocsPage() {
  return (
    <main className="min-h-screen bg-[#fafafa] text-zinc-950">
      <header className="sticky top-0 z-40 border-b border-zinc-200 bg-white/95 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-[1440px] items-center justify-between gap-3 px-4 sm:px-6">
          <div className="flex min-w-0 items-center gap-3">
            <Link href="/" className="grid size-9 shrink-0 place-items-center rounded-md border border-zinc-200 text-zinc-600 transition hover:bg-zinc-50" aria-label="返回首页">
              <ArrowLeft className="size-4" />
            </Link>
            <div className="flex min-w-0 items-center gap-2">
              <BookOpen className="size-5 shrink-0 text-blue-600" />
              <div className="min-w-0">
                <div className="truncate text-sm font-semibold text-zinc-950">VizForge Motion Docs</div>
                <div className="hidden truncate text-xs text-zinc-500 sm:block">API、VisualSpec、高清导出和生产限制</div>
              </div>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <Link href="/playground" className="inline-flex h-9 items-center gap-2 rounded-md border border-zinc-200 bg-white px-3 text-sm font-semibold text-zinc-700 transition hover:bg-zinc-50">
              <Search className="size-4" />
              调试请求
            </Link>
            <Link href="/editor" className="hidden h-9 items-center gap-2 rounded-md bg-zinc-950 px-3 text-sm font-semibold text-white transition hover:bg-zinc-800 sm:inline-flex">
              <ImageDown className="size-4" />
              打开编辑器
            </Link>
          </div>
        </div>
      </header>

      <div className="mx-auto grid max-w-[1440px] grid-cols-1 gap-0 lg:grid-cols-[248px_minmax(0,1fr)] xl:grid-cols-[248px_minmax(0,1fr)_220px]">
        <aside className="hidden border-r border-zinc-200 bg-white px-4 py-6 lg:block">
          <div className="sticky top-24 space-y-7">
            {sidebarGroups.map((group) => (
              <nav key={group.title} aria-label={group.title}>
                <div className="mb-2 px-2 text-xs font-semibold uppercase tracking-wide text-zinc-400">{group.title}</div>
                <div className="grid gap-1">
                  {group.links.map((link) => (
                    <a key={link.href} href={link.href} className="rounded-md px-2 py-1.5 text-sm font-medium text-zinc-600 transition hover:bg-zinc-50 hover:text-zinc-950">
                      {link.label}
                    </a>
                  ))}
                </div>
              </nav>
            ))}
          </div>
        </aside>

        <article className="min-w-0 bg-white px-5 py-8 sm:px-8 lg:px-10">
          <section id="overview" className="scroll-mt-24 border-b border-zinc-200 pb-10">
            <div className="mb-4 inline-flex items-center gap-2 rounded-md border border-blue-100 bg-blue-50 px-2.5 py-1 text-sm font-semibold text-blue-700">
              <TerminalSquare className="size-4" />
              v1 Render API
            </div>
            <h1 className="max-w-3xl text-3xl font-semibold tracking-normal text-zinc-950 sm:text-4xl">API 文档</h1>
            <p className="mt-4 max-w-3xl text-[15px] leading-7 text-zinc-600">
              用一个结构化 JSON 生成图表卡片、动态 SVG 和高清 PNG/WebP/JPEG。页面按开发接入顺序组织：先跑通请求，再看字段契约、图片清晰度、响应结构和错误处理。
            </p>
            <div className="mt-6 grid gap-3 sm:grid-cols-3">
              {[
                { icon: FileJson, label: "输入", value: "JSON / CSV 解析后数据" },
                { icon: Layers3, label: "输出", value: "SVG + 图片 assets" },
                { icon: Gauge, label: "推荐", value: "社媒图片 pixelRatio 2" }
              ].map(({ icon: Icon, label, value }) => (
                <div key={label} className="rounded-lg border border-zinc-200 bg-zinc-50 p-4">
                  <Icon className="mb-3 size-5 text-blue-600" />
                  <div className="text-xs font-semibold text-zinc-500">{label}</div>
                  <div className="mt-1 text-sm font-semibold text-zinc-900">{value}</div>
                </div>
              ))}
            </div>
          </section>

          <SectionHeader id="quickstart" eyebrow="Quickstart" title="最快跑通一次渲染">
            <p>请求 `POST /api/v1/render`，`export.format` 设为 `json` 时会返回 SVG、base64、Data URL 和图片尺寸。需要直接下载 PNG 时，把 `accept` 请求头改成 `image/png`。</p>
          </SectionHeader>
          <div className="grid gap-4 py-6">
            <CodeBlock title="JSON 请求体" badge="application/json" code={requestPayload} />
            <CodeBlock title="返回 JSON assets" badge="curl" code={curlExample} />
          </div>

          <SectionHeader id="endpoint" eyebrow="Endpoint" title="渲染端点">
            <p>生产地址是 `https://vizforge-motion.vercel.app/api/v1/render`。同一份请求可以通过 `accept` 决定返回类型：`application/json`、`image/svg+xml`、`image/png`、`image/webp` 或 `image/jpeg`。</p>
          </SectionHeader>
          <div className="grid gap-3 py-6 md:grid-cols-2">
            {[
              { label: "JSON assets", value: "accept: application/json", note: "适合 n8n、后端服务、批量工作流。" },
              { label: "PNG 文件", value: "accept: image/png", note: "适合远程 API 直接返图。" },
              { label: "SVG 动画", value: "accept: image/svg+xml", note: "适合公众号图文或继续编辑。" },
              { label: "WebP/JPEG", value: "accept: image/webp / image/jpeg", note: "适合网页展示或压缩传输。" }
            ].map((item) => (
              <div key={item.label} className="rounded-lg border border-zinc-200 bg-white p-4">
                <div className="font-semibold text-zinc-950">{item.label}</div>
                <div className="mt-2 font-mono text-xs text-blue-700">{item.value}</div>
                <div className="mt-2 text-sm leading-6 text-zinc-600">{item.note}</div>
              </div>
            ))}
          </div>

          <SectionHeader id="request" eyebrow="VisualSpec" title="请求字段">
            <p>字段越结构化，图形越稳定。没有传 `mappings` 时，接口会根据数据自动推荐分类字段、数值字段、时间字段和系列字段。</p>
          </SectionHeader>
          <div className="grid gap-3 sm:hidden">
            {fieldRows.map(([field, type, note]) => (
              <div key={field} className="rounded-lg border border-zinc-200 bg-white p-4">
                <div className="flex items-center justify-between gap-3">
                  <div className="font-mono text-xs font-semibold text-zinc-950">{field}</div>
                  <div className="rounded-md bg-blue-50 px-2 py-1 font-mono text-xs text-blue-700">{type}</div>
                </div>
                <p className="mt-3 text-sm leading-6 text-zinc-600">{note}</p>
              </div>
            ))}
          </div>
          <div className="hidden overflow-hidden rounded-lg border border-zinc-200 sm:block">
            <table className="w-full border-collapse text-left text-sm">
              <thead className="bg-zinc-50 text-xs uppercase tracking-wide text-zinc-500">
                <tr>
                  <th className="border-b border-zinc-200 px-4 py-3 font-semibold">字段</th>
                  <th className="border-b border-zinc-200 px-4 py-3 font-semibold">类型</th>
                  <th className="border-b border-zinc-200 px-4 py-3 font-semibold">说明</th>
                </tr>
              </thead>
              <tbody>
                {fieldRows.map(([field, type, note]) => (
                  <tr key={field} className="border-b border-zinc-100 last:border-0">
                    <td className="px-4 py-3 font-mono text-xs text-zinc-900">{field}</td>
                    <td className="px-4 py-3 font-mono text-xs text-blue-700">{type}</td>
                    <td className="px-4 py-3 leading-6 text-zinc-600">{note}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <SectionHeader id="quality" eyebrow="Export Quality" title="高清 PNG/WebP/JPEG">
            <p>`export.width` 和 `export.height` 是布局尺寸；`export.pixelRatio` 是最终图片倍率。小红书竖卡推荐 `target: "xiaohongshu"` 加 `pixelRatio: 2`，实际输出就是 2160x2880，文字边缘会明显更清楚。</p>
          </SectionHeader>
          <div className="grid gap-4 py-6">
            <CodeBlock title="直接返回高清 PNG" badge="image/png" code={directPngExample} />
            <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-sm leading-6 text-emerald-900">
              <div className="mb-2 flex items-center gap-2 font-semibold">
                <CheckCircle2 className="size-4" />
                判断清晰度看 assets.width / assets.height
              </div>
              JSON 响应里 `layoutWidth/layoutHeight` 是设计坐标，`width/height` 才是图片文件真实像素。导出 `pixelRatio: 2` 时，这两个数应该分别是布局尺寸的 2 倍。
            </div>
          </div>

          <SectionHeader id="response" eyebrow="Response" title="响应字段">
            <p>响应会把实际使用的色卡、字段映射、数据项数量和导出尺寸一起返回。后端可以用这些字段做日志、质检或自动重试。</p>
          </SectionHeader>
          <div className="py-6">
            <CodeBlock title="响应示例" badge="application/json" code={responseExample} />
          </div>

          <SectionHeader id="wechat" eyebrow="Safety" title="微信安全模式">
            <p>默认开启 `wechatSafeMode`。渲染器会拦截 script、foreignObject、事件处理器、外链资源、base64 图片和不安全动画属性，并返回兼容性评分。</p>
          </SectionHeader>
          <div className="grid gap-3 py-6 sm:grid-cols-2">
            {[
              "动态 SVG 使用原生 SVG/SMIL，不依赖页面 JavaScript。",
              "图片导出由同一份 SVG 服务端栅格化，避免预览和文件布局分叉。",
              "card 字段为空时不会保留空白 KPI 区。",
              "palette 是种子色，响应里的 palette 是本次实际渲染色卡。"
            ].map((item) => (
              <div key={item} className="flex gap-3 rounded-lg border border-zinc-200 bg-white p-4 text-sm leading-6 text-zinc-600">
                <ShieldCheck className="mt-0.5 size-4 shrink-0 text-emerald-600" />
                <span>{item}</span>
              </div>
            ))}
          </div>

          <SectionHeader id="errors" eyebrow="Errors" title="错误处理">
            <p>API 只返回安全错误信息，不回显未清洗的用户输入。自动化调用建议按状态码分流：400 修请求，413 切分数据，500 重试或降级到 SVG。</p>
          </SectionHeader>
          <div className="overflow-hidden rounded-lg border border-zinc-200">
            <table className="w-full border-collapse text-left text-sm">
              <tbody>
                {errorRows.map(([code, note]) => (
                  <tr key={code} className="border-b border-zinc-100 last:border-0">
                    <td className="w-24 px-4 py-3 font-mono text-xs font-semibold text-zinc-950">{code}</td>
                    <td className="px-4 py-3 leading-6 text-zinc-600">{note}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <SectionHeader id="limits" eyebrow="Limits" title="当前限制">
            <p>限制的目标是保证线上渲染稳定，避免单次请求把图表生成压成大批处理任务。</p>
          </SectionHeader>
          <div className="grid gap-2 py-6 sm:grid-cols-2">
            {limitRows.map(([label, value]) => (
              <div key={label} className="flex items-center justify-between gap-4 rounded-lg border border-zinc-200 bg-white px-4 py-3">
                <span className="text-sm font-medium text-zinc-600">{label}</span>
                <span className="font-mono text-xs font-semibold text-zinc-950">{value}</span>
              </div>
            ))}
          </div>
        </article>

        <aside className="hidden border-l border-zinc-200 bg-white px-5 py-8 xl:block">
          <div className="sticky top-24">
            <div className="mb-3 text-xs font-semibold uppercase tracking-wide text-zinc-400">On this page</div>
            <nav className="grid gap-1">
              {pageOutline.map((item) => (
                <a key={item.href} href={item.href} className="rounded-md px-2 py-1.5 text-sm text-zinc-500 transition hover:bg-zinc-50 hover:text-zinc-950">
                  {item.label}
                </a>
              ))}
            </nav>
            <div className="mt-8 rounded-lg border border-zinc-200 bg-zinc-50 p-4">
              <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-zinc-900">
                <Braces className="size-4 text-blue-600" />
                生产建议
              </div>
              <p className="text-sm leading-6 text-zinc-600">社媒返图优先用 JSON assets 记录元数据；真正发图使用 `imageDataUrl` 或直接 `accept: image/png` 下载。</p>
            </div>
          </div>
        </aside>
      </div>
    </main>
  );
}
