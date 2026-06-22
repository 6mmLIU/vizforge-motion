"use client";

import { ArrowLeft, Clipboard, Code2, Download, Play } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";

const defaultPayload = JSON.stringify(
  {
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
  },
  null,
  2
);

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

  async function render() {
    setLoading(true);
    setResponseText("");
    try {
      const parsed = JSON.parse(requestText);
      const response = await fetch("/api/v1/render", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(parsed)
      });
      const json = await response.json();
      setResponseText(JSON.stringify(json, null, 2));
      setSvg(json.assets?.svg ?? json.svg ?? "");
      setImageDataUrl(json.assets?.imageDataUrl ?? "");
    } catch (error) {
      setResponseText(error instanceof Error ? error.message : "请求失败。");
      setSvg("");
      setImageDataUrl("");
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

      <div className="grid min-w-0 gap-4 overflow-hidden p-4 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
        <section className="min-w-0 rounded-2xl border border-zinc-200 bg-white p-4 shadow-[0_2px_12px_rgba(0,0,0,0.04)]">
          <div className="mb-3 flex items-center justify-between">
            <h1 className="text-sm font-semibold text-zinc-700">请求 JSON</h1>
            <button onClick={render} disabled={loading} className="inline-flex items-center gap-2 rounded-full bg-blue-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-600 disabled:opacity-60">
              <Play className="h-4 w-4" />
              {loading ? "生成中" : "生成素材"}
            </button>
          </div>
          <textarea
            value={requestText}
            onChange={(event) => setRequestText(event.target.value)}
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
                <button onClick={() => copy(svg)} className="inline-flex items-center gap-2 rounded-full bg-zinc-100 px-3 py-2 text-sm font-semibold transition hover:bg-zinc-200">
                  <Clipboard className="h-4 w-4" />
                  复制 SVG
                </button>
                <button onClick={() => imageDataUrl && downloadText(imageDataUrl, "vizforge-image-data-url.txt", "text/plain")} className="inline-flex items-center gap-2 rounded-full bg-zinc-100 px-3 py-2 text-sm font-semibold transition hover:bg-zinc-200">
                  <Download className="h-4 w-4" />
                  保存 Data URL
                </button>
              </div>
            </div>
            <div className="svg-card-preview min-h-[360px] w-full rounded-xl border border-zinc-200 bg-zinc-50 p-3" dangerouslySetInnerHTML={{ __html: svg }} />
          </div>
          <div className="min-w-0 overflow-hidden rounded-2xl border border-zinc-200 bg-white p-4 shadow-[0_2px_12px_rgba(0,0,0,0.04)]">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-sm font-semibold text-zinc-700">调用示例与响应</h2>
              <button onClick={() => copy(responseText)} className="inline-flex items-center gap-2 rounded-full bg-zinc-100 px-3 py-2 text-sm font-semibold transition hover:bg-zinc-200">
                <Clipboard className="h-4 w-4" />
                复制响应
              </button>
            </div>
            <div className="grid gap-3 xl:grid-cols-3">
              {Object.entries(snippets).map(([label, snippet]) => (
                <div key={label} className="min-w-0 rounded-xl border border-zinc-200 bg-zinc-50 p-3">
                  <div className="mb-2 flex items-center justify-between text-xs font-semibold uppercase tracking-[0.14em] text-blue-600">
                    {label}
                    <button onClick={() => copy(snippet)} className="rounded bg-white px-2 py-1 text-zinc-700 shadow-sm">
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
    </main>
  );
}
