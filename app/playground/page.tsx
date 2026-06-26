"use client";

import { ArrowLeft, Clipboard, Code2, Download, Play, TriangleAlert } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";
import { Toast, useToast } from "../_hooks/useToast";

const examples = [
  {
    key: "bar",
    label: "柱状图",
    payload: {
      title: "销售表现",
      visual: { type: "bar", story: "magnitude" },
      data: [
        { month: "2026-01", value: 29, channel: "自然流量" },
        { month: "2026-02", value: 52, channel: "自然流量" },
        { month: "2026-03", value: 34, channel: "自然流量" },
        { month: "2026-04", value: 16, channel: "自然流量" }
      ],
      card: {
        periodLabel: "最近 2 周",
        metrics: [
          { label: "周销售额", value: "28,441", prefix: "$", delta: "3.3%", trend: "up" },
          { label: "日销售额", value: "4,063", prefix: "$", delta: "3.3%", trend: "up" },
          { label: "总销量", value: 278, delta: "3.3%", trend: "up" }
        ]
      },
      palette: ["#2f63d8", "#16a394", "#f06a3f", "#7b61ff"],
      export: { format: "json", target: "xiaohongshu" }
    }
  },
  {
    key: "donut",
    label: "环形占比",
    payload: {
      title: "渠道占比",
      visual: { type: "donut", story: "part-to-whole" },
      data: [
        { channel: "自然流量", value: 42 },
        { channel: "付费广告", value: 31 },
        { channel: "公众号", value: 24 },
        { channel: "小红书", value: 18 },
        { channel: "社群", value: 12 }
      ],
      palette: ["#3b6ef5", "#12b3a6", "#f59e0b", "#ef5da8", "#7c5cff"],
      export: { format: "json", target: "xiaohongshu" }
    }
  },
  {
    key: "horizontal-bar",
    label: "渠道排行",
    payload: {
      title: "渠道排行",
      visual: { type: "horizontal-bar", story: "ranking" },
      data: [
        { channel: "自然流量", value: 118 },
        { channel: "付费广告", value: 96 },
        { channel: "公众号", value: 82 },
        { channel: "小红书", value: 77 },
        { channel: "社群转化", value: 64 }
      ],
      export: { format: "json", target: "highres" }
    }
  },
  {
    key: "area",
    label: "双系列趋势",
    payload: {
      title: "访问来源趋势",
      visual: { type: "area", story: "change-over-time" },
      data: [
        { month: "2026-01", channel: "自然流量", value: 29 },
        { month: "2026-02", channel: "自然流量", value: 38 },
        { month: "2026-03", channel: "自然流量", value: 33 },
        { month: "2026-04", channel: "自然流量", value: 42 },
        { month: "2026-01", channel: "付费广告", value: 14 },
        { month: "2026-02", channel: "付费广告", value: 24 },
        { month: "2026-03", channel: "付费广告", value: 18 },
        { month: "2026-04", channel: "付费广告", value: 30 }
      ],
      export: { format: "json", target: "highres" }
    }
  },
  {
    key: "heatmap",
    label: "活动热力",
    payload: {
      title: "活动热力图",
      visual: { type: "heatmap", story: "change-over-time" },
      data: Array.from({ length: 119 }, (_, index) => {
        const date = new Date(Date.UTC(2026, 0, 1 + index));
        return { date: date.toISOString().slice(0, 10), value: index % 13 === 0 ? 0 : Math.round(Math.abs(Math.sin(index / 6) * 9)) };
      }),
      export: { format: "json", target: "highres" }
    }
  }
] as const;

const defaultPayload = JSON.stringify(examples[0].payload, null, 2);

function copy(text: string) {
  void navigator.clipboard?.writeText(text);
}

function downloadText(text: string, filename: string, type: string) {
  const blob = new Blob([text], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export default function PlaygroundPage() {
  const [requestText, setRequestText] = useState(defaultPayload);
  const [svg, setSvg] = useState("");
  const [imageDataUrl, setImageDataUrl] = useState("");
  const [responseText, setResponseText] = useState("");
  const [loading, setLoading] = useState(false);
  const [parseError, setParseError] = useState("");
  const { toast, show } = useToast(2000);

  const snippets = useMemo(() => {
    const oneLine = requestText.replace(/\s+/g, " ").replace(/'/g, "\\'");
    const curl = `curl -X POST http://localhost:3000/api/v1/render \\
  -H "content-type: application/json" \\
  -d '${oneLine}'`;
    const js = `const response = await fetch("/api/v1/render", {
  method: "POST",
  headers: { "content-type": "application/json" },
  body: JSON.stringify(payload)
});
const { assets, compatibility } = await response.json();`;
    const java = `HttpRequest request = HttpRequest.newBuilder()
  .uri(URI.create("http://localhost:3000/api/v1/render"))
  .header("content-type", "application/json")
  .POST(HttpRequest.BodyPublishers.ofString(json))
  .build();`;
    return { curl, js, java };
  }, [requestText]);

  function selectExample(example: (typeof examples)[number]) {
    setRequestText(JSON.stringify(example.payload, null, 2));
    setParseError("");
    show(`已切换示例：${example.label}`);
  }

  function validateJson(text: string): string {
    if (!text.trim()) return "请求体不能为空。";
    try {
      JSON.parse(text);
      return "";
    } catch (error) {
      return error instanceof Error ? `JSON 解析失败：${error.message}` : "JSON 解析失败。";
    }
  }

  async function render() {
    const error = validateJson(requestText);
    if (error) {
      setParseError(error);
      show(error);
      return;
    }
    setParseError("");
    setLoading(true);
    setResponseText("");
    show("正在生成素材...");
    try {
      const parsed = JSON.parse(requestText);
      const response = await fetch("/api/v1/render", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(parsed)
      });
      const json = await response.json();
      if (!response.ok) {
        const message = json.error ?? `请求失败：${response.status}`;
        setResponseText(JSON.stringify(json, null, 2));
        setSvg("");
        setImageDataUrl("");
        show(message);
        return;
      }
      setResponseText(JSON.stringify(json, null, 2));
      setSvg(json.assets?.svg ?? json.svg ?? "");
      setImageDataUrl(json.assets?.imageDataUrl ?? "");
      show("生成成功");
    } catch (error) {
      const message = error instanceof Error ? error.message : "请求失败。";
      setResponseText(message);
      setSvg("");
      setImageDataUrl("");
      show(message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-[#f7f7f8] text-zinc-950">
      <header className="flex items-center justify-between border-b border-zinc-200 bg-white px-5 py-4">
        <div className="flex items-center gap-3">
          <Link href="/" className="grid h-9 w-9 place-items-center rounded-full bg-zinc-100 transition hover:bg-zinc-200">
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div>
            <div className="text-sm font-semibold text-zinc-950">API 调试台</div>
            <div className="text-xs text-zinc-500">提交数据和配置，预览接口返回的 SVG、图片 Data URL 与兼容性结果。</div>
          </div>
        </div>
        <Link href="/docs" className="rounded-full bg-zinc-100 px-4 py-2 text-sm font-semibold transition hover:bg-zinc-200">
          查看文档
        </Link>
      </header>

      <div className="border-b border-zinc-200 bg-white px-5 py-3">
        <div className="flex flex-wrap items-center gap-2">
          <span className="mr-2 text-xs font-semibold uppercase tracking-wider text-zinc-400">示例</span>
          {examples.map((example) => (
            <button
              key={example.key}
              onClick={() => selectExample(example)}
              className="rounded-full border border-zinc-200 bg-zinc-50 px-3 py-1.5 text-xs font-semibold text-zinc-700 transition hover:border-blue-300 hover:bg-blue-50 hover:text-blue-700"
            >
              {example.label}
            </button>
          ))}
        </div>
      </div>

      <div className="grid min-w-0 gap-4 overflow-hidden p-4 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
        <section className="min-w-0 rounded-2xl border border-zinc-200 bg-white p-4 shadow-[0_2px_12px_rgba(0,0,0,0.04)]">
          <div className="mb-3 flex items-center justify-between">
            <h1 className="text-sm font-semibold text-zinc-700">请求 JSON</h1>
            <button
              onClick={render}
              disabled={loading}
              className="inline-flex items-center gap-2 rounded-full bg-blue-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-600 disabled:opacity-60"
            >
              <Play className="h-4 w-4" />
              {loading ? "生成中" : "生成素材"}
            </button>
          </div>
          {parseError ? (
            <div className="mb-3 flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-medium text-amber-800">
              <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{parseError}</span>
            </div>
          ) : null}
          <textarea
            value={requestText}
            onChange={(event) => {
              setRequestText(event.target.value);
              if (parseError) setParseError("");
            }}
            className="min-h-[620px] w-full resize-y rounded-xl border border-zinc-200 bg-zinc-50 p-4 font-mono text-sm leading-6 text-zinc-900 outline-none focus:border-blue-400 focus:bg-white"
            spellCheck={false}
          />
        </section>

        <section className="grid min-w-0 gap-4">
          <div className="min-w-0 overflow-hidden rounded-2xl border border-zinc-200 bg-white p-4 shadow-[0_2px_12px_rgba(0,0,0,0.04)]">
            <div className="mb-3 flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm font-semibold text-zinc-700">
                <Code2 className="h-4 w-4 text-blue-500" />
                返回的动态图表
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    copy(svg);
                    show("已复制 SVG");
                  }}
                  className="inline-flex items-center gap-2 rounded-full bg-zinc-100 px-3 py-2 text-sm font-semibold transition hover:bg-zinc-200"
                >
                  <Clipboard className="h-4 w-4" />
                  复制 SVG
                </button>
                <button
                  onClick={() => {
                    if (!imageDataUrl) {
                      show("暂无可保存的图片 Data URL");
                      return;
                    }
                    downloadText(imageDataUrl, "vizforge-image-data-url.txt", "text/plain");
                    show("已保存 Data URL");
                  }}
                  className="inline-flex items-center gap-2 rounded-full bg-zinc-100 px-3 py-2 text-sm font-semibold transition hover:bg-zinc-200"
                >
                  <Download className="h-4 w-4" />
                  保存 Data URL
                </button>
              </div>
            </div>
            <div className="svg-card-preview min-h-[360px] w-full rounded-xl border border-zinc-200 bg-zinc-50 p-3" dangerouslySetInnerHTML={{ __html: svg }} />
            {!svg ? <div className="mt-3 text-center text-xs text-zinc-400">点击「生成素材」预览返回的图表。</div> : null}
          </div>
          <div className="min-w-0 overflow-hidden rounded-2xl border border-zinc-200 bg-white p-4 shadow-[0_2px_12px_rgba(0,0,0,0.04)]">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-sm font-semibold text-zinc-700">调用示例与响应</h2>
              <button
                onClick={() => {
                  copy(responseText);
                  show("已复制响应");
                }}
                className="inline-flex items-center gap-2 rounded-full bg-zinc-100 px-3 py-2 text-sm font-semibold transition hover:bg-zinc-200"
              >
                <Clipboard className="h-4 w-4" />
                复制响应
              </button>
            </div>
            <div className="grid gap-3 xl:grid-cols-3">
              {Object.entries(snippets).map(([label, snippet]) => (
                <div key={label} className="min-w-0 rounded-xl border border-zinc-200 bg-zinc-50 p-3">
                  <div className="mb-2 flex items-center justify-between text-xs font-semibold uppercase tracking-[0.14em] text-blue-600">
                    {label}
                    <button
                      onClick={() => {
                        copy(snippet);
                        show(`已复制 ${label} 示例`);
                      }}
                      className="rounded bg-white px-2 py-1 text-zinc-700 shadow-sm"
                    >
                      复制
                    </button>
                  </div>
                  <pre className="max-w-full overflow-x-auto text-xs leading-5 text-zinc-600">{snippet}</pre>
                </div>
              ))}
            </div>
            <pre className="mt-4 max-h-56 max-w-full overflow-auto rounded-xl border border-zinc-200 bg-zinc-50 p-3 text-xs leading-5 text-zinc-600">{responseText}</pre>
          </div>
        </section>
      </div>

      <Toast toast={toast} />
    </main>
  );
}
