import { renderAnimatedSvg } from "@/lib/motion/animatedSvgRenderer";
import { DEFAULT_VISUAL_SPEC, VISUAL_TYPES, type VisualSpec } from "@/lib/visual/visualSpec";
import { describe, expect, it } from "vitest";

function spec(overrides: Partial<VisualSpec>): VisualSpec {
  return { ...DEFAULT_VISUAL_SPEC, ...overrides } as VisualSpec;
}

describe("renderAnimatedSvg", () => {
  it("renders animated bar grow with height and y animations", () => {
    const result = renderAnimatedSvg(spec({ type: "bar" }));
    expect(result.svg).toContain('attributeName="height"');
    expect(result.svg).toContain('attributeName="y"');
    expect(result.compatibility.safe).toBe(true);
  });

  it("keeps physical export dimensions while downscaling the logical design canvas", () => {
    const result = renderAnimatedSvg(spec({ export: { ...DEFAULT_VISUAL_SPEC.export, width: 1080, height: 1440 } }));
    expect(result.svg).toContain('width="1080"');
    expect(result.svg).toContain('height="1440"');
    const viewBox = result.svg.match(/viewBox="0 0 (\d+) (\d+)"/);
    expect(viewBox).not.toBeNull();
    expect(Number(viewBox?.[1])).toBeLessThan(1080);
    expect(result.compatibility.safe).toBe(true);
  });

  it("renders one bar per provided row instead of a fixed template count", () => {
    const rows = Array.from({ length: 24 }, (_, index) => ({ label: `Item ${index + 1}`, value: index + 1 }));
    const result = renderAnimatedSvg(spec({ type: "bar", card: undefined, data: { rows }, mappings: { category: "label", value: "value" } }));
    expect((result.svg.match(/attributeName="height"/g) ?? []).length).toBe(24);
    expect(result.compatibility.safe).toBe(true);
  });

  it("wraps dense Chinese bar labels into adaptive tspans", () => {
    const labels = ["自然流量", "付费广告", "公众号", "小红书"];
    const rows = Array.from({ length: 12 }, (_, index) => ({ channel: labels[index % labels.length], value: index + 1 }));
    const result = renderAnimatedSvg(spec({ type: "bar", card: undefined, data: { rows }, mappings: { category: "channel", value: "value" } }));
    expect(result.svg).toContain("<tspan");
    expect(result.compatibility.safe).toBe(true);
  });

  it("renders horizontal ranking bars from the provided rows", () => {
    const result = renderAnimatedSvg(
      spec({
        type: "horizontal-bar",
        story: "ranking",
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
      })
    );
    expect((result.svg.match(/attributeName="width"/g) ?? []).length).toBe(4);
    expect(result.svg).toContain(">自然流量<");
    expect(result.svg).toContain(">小红书<");
    expect(result.compatibility.safe).toBe(true);
  });

  it("renders donut sweep with stroke-dashoffset animation and category palette", () => {
    const rows = Array.from({ length: 6 }, (_, index) => ({ channel: `渠道 ${index + 1}`, value: index + 2 }));
    const result = renderAnimatedSvg(
      spec({ type: "donut", story: "part-to-whole", card: undefined, data: { rows }, mappings: { category: "channel", value: "value" } })
    );
    expect(result.svg).toContain('attributeName="stroke-dashoffset"');
    expect(result.palette).toHaveLength(6);
    expect(result.compatibility.safe).toBe(true);
  });

  it("applies the seed palette starting color", () => {
    const result = renderAnimatedSvg(spec({ type: "donut", story: "part-to-whole", palette: ["#ff3366", "#00aaff"], card: undefined }));
    expect(result.palette[0]).toBe("#ff3366");
    expect(result.svg).toContain('stroke="#ff3366"');
  });

  it("renders line draw with stroke-dashoffset animation", () => {
    const result = renderAnimatedSvg(spec({ type: "line", story: "change-over-time", card: undefined, mappings: { category: "month", value: "value", x: "month", y: "value" } }));
    expect(result.svg).toContain('attributeName="stroke-dashoffset"');
    expect(result.compatibility.safe).toBe(true);
  });

  it("renders multi-series area trends from a real series field", () => {
    const result = renderAnimatedSvg(
      spec({
        type: "area",
        story: "change-over-time",
        card: undefined,
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
        mappings: { x: "month", y: "value", category: "month", value: "value", series: "channel" }
      })
    );
    expect((result.svg.match(/stroke-dasharray="1"/g) ?? []).length).toBeGreaterThanOrEqual(2);
    expect(result.svg).toContain("自然流量");
    expect(result.svg).toContain("付费广告");
    expect(result.compatibility.safe).toBe(true);
  });

  it("renders a calendar heatmap without fake tabs and with an intensity legend", () => {
    const rows = Array.from({ length: 365 }, (_, index) => {
      const date = new Date(Date.UTC(2025, 6, 1 + index));
      return { date: date.toISOString().slice(0, 10), value: index % 11 === 0 ? 0 : (index % 47) + 1 };
    });
    const result = renderAnimatedSvg(
      spec({ title: "活动热力图", subtitle: undefined, type: "heatmap", story: "change-over-time", card: undefined, data: { rows }, mappings: { category: "date", value: "value", x: "date", y: "value" } })
    );
    expect((result.svg.match(/attributeName="opacity"/g) ?? []).length).toBeGreaterThanOrEqual(300);
    expect(result.svg).not.toContain(">每日<");
    expect(result.svg).not.toContain(">累计<");
    expect(result.svg).toContain(">少<");
    expect(result.svg).toContain(">多<");
    expect(result.compatibility.safe).toBe(true);
  });

  it("renders short heatmap datasets as readable matrix tiles", () => {
    const rows = Array.from({ length: 12 }, (_, index) => ({ month: `2026-${String(index + 1).padStart(2, "0")}`, value: 20 + index * 3 }));
    const result = renderAnimatedSvg(spec({ title: "月度热力", subtitle: undefined, type: "heatmap", story: "change-over-time", card: undefined, data: { rows }, mappings: { category: "month", value: "value" } }));
    expect(result.svg).toContain(">53<");
    expect(result.svg).not.toContain(">每日<");
    expect(result.compatibility.safe).toBe(true);
  });

  it("renders rose bloom with path d animation", () => {
    const result = renderAnimatedSvg(spec({ type: "rose", story: "part-to-whole", card: undefined }));
    expect(result.svg).toContain('attributeName="d"');
    expect(result.compatibility.safe).toBe(true);
  });

  it("renders treemap tiles with labels and percentages", () => {
    const result = renderAnimatedSvg(
      spec({
        type: "treemap",
        story: "part-to-whole",
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
      })
    );
    expect(result.svg).toContain(">自然流量<");
    expect(result.svg).toContain("%<");
    expect(result.compatibility.safe).toBe(true);
  });

  it("spreads date-like scatter x values across the plot", () => {
    const result = renderAnimatedSvg(
      spec({
        type: "scatter",
        story: "correlation",
        card: undefined,
        data: {
          rows: [
            { month: "2026-01", channel: "自然流量", value: 29, orders: 8 },
            { month: "2026-02", channel: "付费广告", value: 52, orders: 18 },
            { month: "2026-03", channel: "公众号", value: 34, orders: 13 },
            { month: "2026-04", channel: "小红书", value: 16, orders: 5 }
          ]
        },
        mappings: { x: "month", y: "orders", category: "channel", value: "value" }
      })
    );
    const xPositions = [...result.svg.matchAll(/transform="translate\(([\d.]+) /g)].map((match) => Number(match[1]));
    expect(new Set(xPositions.map((value) => value.toFixed(1))).size).toBeGreaterThan(2);
    expect(result.compatibility.safe).toBe(true);
  });

  it("renders metric-card from card and row data", () => {
    const result = renderAnimatedSvg(
      spec({
        type: "metric-card",
        story: "single-metric",
        data: { rows: [{ month: "2026-01", value: 18 }, { month: "2026-02", value: 30 }, { month: "2026-03", value: 24 }] },
        mappings: { category: "month", value: "value" },
        card: { periodLabel: "", metrics: [{ label: "核心收入", value: "88,000", prefix: "¥" }] }
      })
    );
    expect(result.svg).toContain("核心收入");
    expect(result.svg).toContain("¥88,000");
    expect(result.compatibility.safe).toBe(true);
  });

  it("renders dashboard card metadata only when it exists", () => {
    const withoutCard = renderAnimatedSvg(spec({ card: undefined, type: "bar" }));
    expect(withoutCard.svg).not.toContain("周销售额");

    const withCard = renderAnimatedSvg(spec({ type: "bar", card: { periodLabel: "本月", metrics: [{ label: "收入", value: "88,000", prefix: "¥", delta: "12%", trend: "up" }] } }));
    expect(withCard.svg).toContain("本月");
    expect(withCard.svg).toContain("收入");
    expect(withCard.svg).toContain("¥88,000");
  });

  it("expands the effective palette to match the rendered data item count", () => {
    const rows = Array.from({ length: 12 }, (_, index) => ({ channel: `渠道 ${index + 1}`, value: index + 1 }));
    const result = renderAnimatedSvg(spec({ type: "rose", story: "part-to-whole", palette: ["#0a84ff", "#38bdf8"], card: undefined, data: { rows }, mappings: { category: "channel", value: "value" } }));
    expect(result.palette).toHaveLength(12);
    expect(new Set(result.palette).size).toBe(12);
  });

  it("renders every registered VisualType as WeChat-safe SVG", () => {
    for (const type of VISUAL_TYPES) {
      const result = renderAnimatedSvg(
        spec({
          type,
          mappings:
            type === "scatter" || type === "bubble"
              ? { x: "value", y: "value", category: "channel", value: "value" }
              : DEFAULT_VISUAL_SPEC.mappings
        })
      );
      expect(result.svg).toContain("<svg");
      expect(result.compatibility.safe, `${type} should be WeChat safe`).toBe(true);
    }
  });
});
