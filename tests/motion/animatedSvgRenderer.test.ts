import { renderAnimatedSvg } from "@/lib/motion/animatedSvgRenderer";
import { DEFAULT_VISUAL_SPEC, VISUAL_TYPES } from "@/lib/visual/visualSpec";
import { describe, expect, it } from "vitest";

describe("renderAnimatedSvg", () => {
  it("renders animated bar grow with height and y animations", () => {
    const result = renderAnimatedSvg({ ...DEFAULT_VISUAL_SPEC, type: "bar" });
    expect(result.svg).toContain('attributeName="height"');
    expect(result.svg).toContain('attributeName="y"');
    expect(result.compatibility.safe).toBe(true);
  });

  it("keeps high-resolution exports on a readable design canvas", () => {
    const result = renderAnimatedSvg({
      ...DEFAULT_VISUAL_SPEC,
      export: {
        ...DEFAULT_VISUAL_SPEC.export,
        width: 1080,
        height: 1440
      }
    });

    expect(result.svg).toContain('width="1080"');
    expect(result.svg).toContain('height="1440"');
    expect(result.svg).toContain('viewBox="0 0 720 960"');
    expect(result.svg).toContain('font-size="40"');
    expect(result.svg).toContain('y="78"');
    expect(result.svg).not.toContain("数据快照");
    expect(result.compatibility.safe).toBe(true);
  });

  it("keeps social poster titles legible without a template eyebrow label", () => {
    const result = renderAnimatedSvg({
      ...DEFAULT_VISUAL_SPEC,
      title: "小红书投放销售表现复盘与下周增长策略",
      subtitle: "长标题时副标题让位给主标题",
      theme: "editorial-light",
      export: {
        ...DEFAULT_VISUAL_SPEC.export,
        width: 1080,
        height: 1440
      }
    });

    expect(result.svg).not.toContain("数据快照");
    expect(result.svg).toContain('font-size="34"');
    expect(result.svg).toContain('y="72"');
    expect(result.svg).not.toContain("长标题时副标题让位给主标题");
    expect(result.compatibility.safe).toBe(true);
  });

  it("renders bar count from the provided dataset", () => {
    const result = renderAnimatedSvg({
      ...DEFAULT_VISUAL_SPEC,
      type: "bar",
      theme: "editorial-light",
      data: {
        rows: [
          { label: "A", value: 10 },
          { label: "B", value: 20 },
          { label: "C", value: 30 }
        ]
      },
      mappings: { category: "label", value: "value" }
    });

    const barAnimations = result.svg.match(/attributeName="height"/g) ?? [];
    expect(barAnimations).toHaveLength(3);
    expect(result.svg).toContain(">A<");
    expect(result.svg).toContain(">C<");
  });

  it("renders one bar per provided row instead of a fixed template count", () => {
    const rows = Array.from({ length: 40 }, (_, index) => ({
      label: `Item ${index + 1}`,
      value: index + 1
    }));
    const result = renderAnimatedSvg({
      ...DEFAULT_VISUAL_SPEC,
      type: "bar",
      theme: "editorial-light",
      data: { rows },
      mappings: { category: "label", value: "value" }
    });

    const barAnimations = result.svg.match(/attributeName="height"/g) ?? [];
    expect(barAnimations).toHaveLength(40);
    expect(result.warnings.join(" ")).not.toContain("bar uses the first 30 rows");
    expect(result.compatibility.safe).toBe(true);
  });

  it("uses wider centered dashboard bars for small datasets", () => {
    const result = renderAnimatedSvg({
      ...DEFAULT_VISUAL_SPEC,
      type: "bar",
      theme: "editorial-light",
      data: {
        rows: [
          { label: "A", value: 10 },
          { label: "B", value: 20 },
          { label: "C", value: 30 },
          { label: "D", value: 24 }
        ]
      },
      mappings: { category: "label", value: "value" }
    });

    expect(result.svg).toContain('width="42"');
    expect(result.svg).toContain('x="201.66"');
    expect(result.compatibility.safe).toBe(true);
  });

  it("wraps dense Chinese bar labels into adaptive SVG tspans", () => {
    const labels = ["自然流量", "付费广告", "公众号", "小红书"];
    const rows = Array.from({ length: 12 }, (_, index) => ({
      channel: labels[index % labels.length],
      value: index + 1
    }));
    const result = renderAnimatedSvg({
      ...DEFAULT_VISUAL_SPEC,
      type: "bar",
      theme: "editorial-light",
      data: { rows },
      mappings: { category: "channel", value: "value" }
    });

    expect(result.svg).toContain("<tspan");
    expect(result.svg).toContain(">自然<");
    expect(result.svg).toContain(">流量<");
    expect(result.svg).not.toContain(">自然流量<");
    expect(result.compatibility.safe).toBe(true);
  });

  it("renders horizontal ranking bars from the provided rows", () => {
    const result = renderAnimatedSvg({
      ...DEFAULT_VISUAL_SPEC,
      type: "horizontal-bar",
      story: "ranking",
      theme: "editorial-light",
      card: undefined,
      data: {
        rows: [
          { channel: "自然流量", value: 118 },
          { channel: "付费广告", value: 96 },
          { channel: "公众号", value: 82 },
          { channel: "小红书", value: 77 }
        ]
      },
      mappings: { category: "channel", value: "value" }
    });

    expect(result.svg.match(/attributeName="width"/g) ?? []).toHaveLength(4);
    expect(result.svg).toContain(">自然流量<");
    expect(result.svg).toContain(">小红书<");
    expect(result.compatibility.safe).toBe(true);
  });

  it("expands the effective palette to match the rendered data item count", () => {
    const rows = Array.from({ length: 12 }, (_, index) => ({
      channel: `渠道 ${index + 1}`,
      value: index + 1
    }));
    const result = renderAnimatedSvg({
      ...DEFAULT_VISUAL_SPEC,
      type: "rose",
      story: "part-to-whole",
      theme: "editorial-light",
      palette: ["#0a84ff", "#38bdf8"],
      data: { rows },
      mappings: { category: "channel", value: "value" }
    });

    expect(result.palette).toHaveLength(12);
    expect(new Set(result.palette).size).toBe(12);
    expect(result.svg.match(/attributeName="d"/g) ?? []).toHaveLength(12);
  });

  it("renders dashboard card metadata only when it exists in JSON", () => {
    const withoutCard = renderAnimatedSvg({
      ...DEFAULT_VISUAL_SPEC,
      card: undefined,
      type: "bar",
      theme: "editorial-light"
    });
    expect(withoutCard.svg).not.toContain("最近 2 周");
    expect(withoutCard.svg).not.toContain("周销售额");

    const withCard = renderAnimatedSvg({
      ...DEFAULT_VISUAL_SPEC,
      card: {
        periodLabel: "本月",
        metrics: [{ label: "收入", value: "88,000", prefix: "¥", delta: "12%", trend: "up" }]
      },
      type: "bar",
      theme: "editorial-light"
    });
    expect(withCard.svg).toContain("本月");
    expect(withCard.svg).toContain("收入");
    expect(withCard.svg).toContain("¥88,000");
  });

  it("adapts dashboard card components when optional fields are empty", () => {
    const result = renderAnimatedSvg({
      ...DEFAULT_VISUAL_SPEC,
      type: "bar",
      theme: "editorial-light",
      card: {
        periodLabel: "最近 2 周",
        metrics: [
          { label: "周销售额", value: "28,441", prefix: "$", delta: "3.3%", trend: "" as never },
          { label: "日销售额", value: "4,063", prefix: "$", delta: "3.3%", trend: "up" },
          { label: "总销量", value: 278, delta: "3.3%", trend: "up" }
        ]
      },
      data: {
        rows: [
          { month: "2026-01", value: 29, channel: "自然流量" },
          { month: "2026-02", value: 52, channel: "自然流量" },
          { month: "2026-03", value: 34, channel: "自然流量" },
          { month: "2026-04", value: 16, channel: "自然流量" }
        ]
      }
    });

    const upTrends = result.svg.match(/>↑ 3\.3%<\/text>/g) ?? [];
    expect(upTrends).toHaveLength(2);
    expect(result.svg).toContain(">最近 2 周</text>");
    expect(result.svg).not.toContain("l 8 8 l 8 -8");
  });

  it("applies custom palette colors to rendered SVG", () => {
    const result = renderAnimatedSvg({
      ...DEFAULT_VISUAL_SPEC,
      type: "bar",
      theme: "editorial-light",
      palette: ["#ff3366", "#00aaff"],
      data: { rows: [{ label: "A", value: 10 }] },
      mappings: { category: "label", value: "value" }
    });
    expect(result.svg).toContain('fill="#ff3366"');
  });

  it("renders donut sweep with stroke-dashoffset animation", () => {
    const result = renderAnimatedSvg({
      ...DEFAULT_VISUAL_SPEC,
      type: "donut",
      story: "part-to-whole",
      motion: { ...DEFAULT_VISUAL_SPEC.motion, preset: "sweep" }
    });
    expect(result.svg).toContain('attributeName="stroke-dashoffset"');
    expect(result.compatibility.safe).toBe(true);
  });

  it("renders line draw with stroke-dashoffset animation", () => {
    const result = renderAnimatedSvg({
      ...DEFAULT_VISUAL_SPEC,
      type: "line",
      story: "change-over-time",
      mappings: { category: "month", value: "value", x: "month", y: "value" },
      motion: { ...DEFAULT_VISUAL_SPEC.motion, preset: "draw" }
    });
    expect(result.svg).toContain('attributeName="stroke-dashoffset"');
    expect(result.compatibility.safe).toBe(true);
  });

  it("renders area trend as its own SVG card and keeps stable series", () => {
    const result = renderAnimatedSvg({
      ...DEFAULT_VISUAL_SPEC,
      type: "area",
      story: "change-over-time",
      data: {
        rows: [
          { month: "2026-01", channel: "自然流量", value: 20 },
          { month: "2026-01", channel: "付费广告", value: 12 },
          { month: "2026-02", channel: "自然流量", value: 24 },
          { month: "2026-02", channel: "付费广告", value: 18 },
          { month: "2026-03", channel: "自然流量", value: 30 },
          { month: "2026-03", channel: "付费广告", value: 16 }
        ]
      },
      mappings: { x: "month", y: "value", category: "month", value: "value", series: "channel" },
      motion: { ...DEFAULT_VISUAL_SPEC.motion, preset: "draw" }
    });

    expect(result.warnings.join(" ")).not.toContain("area currently uses line draw preview");
    expect(result.svg).toContain("自然流量");
    expect(result.svg).toContain("付费广告");
    expect(result.svg).toContain('stroke-dasharray="1"');
    expect(result.compatibility.safe).toBe(true);
  });

  it("renders wide numeric area data as multiple trend series", () => {
    const result = renderAnimatedSvg({
      ...DEFAULT_VISUAL_SPEC,
      type: "area",
      story: "change-over-time",
      theme: "editorial-light",
      data: {
        rows: [
          { month: "2026-01", 自然流量: 29, 付费广告: 14 },
          { month: "2026-02", 自然流量: 38, 付费广告: 24 },
          { month: "2026-03", 自然流量: 33, 付费广告: 18 },
          { month: "2026-04", 自然流量: 22, 付费广告: 30 }
        ]
      },
      mappings: { x: "month", category: "month", value: "自然流量" },
      motion: { ...DEFAULT_VISUAL_SPEC.motion, preset: "draw" }
    });

    expect(result.svg.match(/stroke-dasharray="1"/g) ?? []).toHaveLength(2);
    expect(result.svg).toContain("自然流量");
    expect(result.svg).toContain("付费广告");
    expect(result.palette).toHaveLength(2);
    expect(result.svg).toContain('stroke="#2f63d8"');
    expect(result.svg).toContain('stroke="#16a394"');
    expect(result.compatibility.safe).toBe(true);
  });

  it("renders calendar heatmap activity from daily rows", () => {
    const rows = Array.from({ length: 365 }, (_, index) => {
      const date = new Date(Date.UTC(2025, 6, 1 + index));
      return {
        date: date.toISOString().slice(0, 10),
        value: index % 11 === 0 ? 0 : (index % 47) + 1
      };
    });
    const result = renderAnimatedSvg({
      ...DEFAULT_VISUAL_SPEC,
      title: "Token 活动",
      subtitle: undefined,
      type: "heatmap",
      story: "change-over-time",
      theme: "editorial-light",
      card: undefined,
      data: { rows },
      mappings: { category: "date", value: "value", x: "date", y: "value" },
      motion: { ...DEFAULT_VISUAL_SPEC.motion, preset: "fade-up" }
    });

    expect(result.svg.match(/attributeName="opacity"/g)?.length ?? 0).toBeGreaterThanOrEqual(365);
    expect(result.svg).toContain(">每日<");
    expect(result.svg).toContain(">每周<");
    expect(result.svg).toContain(">累计<");
    expect(result.svg).toContain(">7月<");
    expect(result.svg).toContain(">6月<");
    expect(result.palette).toHaveLength(365);
    expect(result.warnings.join(" ")).not.toContain("200");
    expect(result.compatibility.safe).toBe(true);
  });

  it("renders metric-card from real card and row data without defaulting missing trend", () => {
    const result = renderAnimatedSvg({
      ...DEFAULT_VISUAL_SPEC,
      type: "metric-card",
      story: "single-metric",
      data: {
        rows: [
          { month: "2026-01", value: 18 },
          { month: "2026-02", value: 30 },
          { month: "2026-03", value: 24 }
        ]
      },
      mappings: { category: "month", value: "value" },
      card: {
        periodLabel: "",
        metrics: [{ label: "核心收入", value: "88,000", prefix: "¥", delta: "12%", trend: "" as never }]
      }
    });

    expect(result.svg).toContain("核心收入");
    expect(result.svg).toContain("¥88,000");
    expect(result.svg).toContain(">01<");
    expect(result.svg).toContain(">03<");
    expect(result.svg).not.toContain(">↑ 12%</text>");
    expect(result.compatibility.safe).toBe(true);
  });

  it("renders rose bloom with path d animation", () => {
    const result = renderAnimatedSvg({
      ...DEFAULT_VISUAL_SPEC,
      type: "rose",
      story: "part-to-whole",
      motion: { ...DEFAULT_VISUAL_SPEC.motion, preset: "bloom" }
    });
    expect(result.svg).toContain('attributeName="d"');
    expect(result.compatibility.safe).toBe(true);
  });

  it("keeps rose sectors visible in the base SVG for static image export", () => {
    const result = renderAnimatedSvg({
      ...DEFAULT_VISUAL_SPEC,
      type: "rose",
      story: "part-to-whole",
      theme: "editorial-light",
      data: {
        rows: [
          { channel: "A", value: 20 },
          { channel: "B", value: 30 },
          { channel: "C", value: 24 }
        ]
      },
      mappings: { category: "channel", value: "value" }
    });

    expect(result.svg).toContain('attributeName="d"');
    expect(result.svg).toContain(" A ");
    expect(result.svg).toContain('opacity="0.92"');
    expect(result.svg).not.toContain('opacity="0"');
    expect(result.compatibility.safe).toBe(true);
  });

  it("renders network nodes beyond the old fixed 18-node template cap", () => {
    const rows = Array.from({ length: 20 }, (_, index) => ({
      label: `Node ${index + 1}`,
      value: index + 1
    }));
    const result = renderAnimatedSvg({
      ...DEFAULT_VISUAL_SPEC,
      type: "network",
      story: "flow",
      data: { rows },
      mappings: { category: "label", value: "value" }
    });

    expect(result.svg).toContain(">Node 20<");
    expect(result.palette).toHaveLength(20);
    expect(result.compatibility.safe).toBe(true);
  });

  it("renders sankey links beyond the old fixed 18-link template cap", () => {
    const rows = Array.from({ length: 20 }, (_, index) => ({
      source: `Source ${index + 1}`,
      target: `Target ${index + 1}`,
      value: index + 1
    }));
    const result = renderAnimatedSvg({
      ...DEFAULT_VISUAL_SPEC,
      type: "sankey",
      story: "flow",
      data: { rows },
      mappings: { source: "source", target: "target", value: "value" }
    });

    expect(result.svg.match(/attributeName="stroke-dashoffset"/g) ?? []).toHaveLength(20);
    expect(result.palette).toHaveLength(40);
    expect(result.compatibility.safe).toBe(true);
  });

  it("renders every registered VisualType as WeChat-safe SVG", () => {
    for (const type of VISUAL_TYPES) {
      const result = renderAnimatedSvg({
        ...DEFAULT_VISUAL_SPEC,
        type,
        story: type === "sankey" || type === "network" ? "flow" : DEFAULT_VISUAL_SPEC.story,
        data:
          type === "sankey"
            ? {
                rows: [
                  { source: "Raw", target: "Clean", value: 40 },
                  { source: "Clean", target: "Story", value: 32 }
                ]
              }
            : DEFAULT_VISUAL_SPEC.data,
        mappings:
          type === "sankey"
            ? { source: "source", target: "target", value: "value" }
            : type === "scatter" || type === "bubble"
              ? { x: "value", y: "value", category: "channel", value: "value" }
              : DEFAULT_VISUAL_SPEC.mappings
      });
      expect(result.svg).toContain("<svg");
      expect(result.compatibility.safe, `${type} should be WeChat safe`).toBe(true);
    }
  });
});
