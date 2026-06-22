import { renderAnimatedSvg } from "@/lib/motion/animatedSvgRenderer";
import { resolvePaletteForSpec, resolveVisualItemCount } from "@/lib/visual/autoPalette";
import { recommendVisual } from "@/lib/visual/recommendVisual";
import { THEMES } from "@/lib/visual/themes";
import { DEFAULT_VISUAL_SPEC, type DataRow, type VisualSpec } from "@/lib/visual/visualSpec";
import { describe, expect, it } from "vitest";

const userRows: DataRow[] = [
  { channel: "自然量", value: 29, month: "2026-01" },
  { channel: "付费广告", value: 52, month: "2026-02" },
  { channel: "公众号", value: 34, month: "2026-03" },
  { channel: "小红书", value: 16, month: "2026-04" },
  { channel: "自然流量", value: 43 },
  { channel: "付费广告", value: 23, month: "2026-06" },
  { channel: "公众号", value: 25, month: "2026-07" },
  { channel: "小红书", value: 30, month: "2026-08" },
  { channel: "自然流量", value: 10, month: "2026-09" },
  { channel: "付费广告", value: 43, month: "2026-10" },
  { channel: "公众号", value: 37, month: "2026-11" },
  { channel: "小红书", value: 31, month: "2026-12" }
];

function specFor(type: VisualSpec["type"], mappings: VisualSpec["mappings"]): VisualSpec {
  return {
    ...DEFAULT_VISUAL_SPEC,
    type,
    story: type === "rose" || type === "donut" ? "part-to-whole" : "magnitude",
    theme: "light",
    palette: ["#0a84ff", "#38bdf8"],
    data: { rows: userRows },
    mappings
  };
}

describe("data-driven visual item counts and palettes", () => {
  it("keeps bar charts row-driven even when one row misses the category field", () => {
    const recommendation = recommendVisual(userRows, { type: "bar", story: "magnitude" });
    const spec = specFor("bar", recommendation.mappings);
    const result = renderAnimatedSvg(spec);

    expect(recommendation.mappings.category).toBe("month");
    expect(resolveVisualItemCount(spec)).toBe(12);
    expect(resolvePaletteForSpec(spec, THEMES["light"])).toHaveLength(12);
    expect(result.palette).toHaveLength(12);
    expect(result.svg.match(/attributeName="height"/g) ?? []).toHaveLength(12);
    expect(result.compatibility.safe).toBe(true);
  });

  it("keeps rose charts category-driven and expands the seed palette to unique categories", () => {
    const recommendation = recommendVisual(userRows, { type: "rose", story: "part-to-whole" });
    const spec = specFor("rose", recommendation.mappings);
    const result = renderAnimatedSvg(spec);

    expect(recommendation.mappings.category).toBe("channel");
    expect(resolveVisualItemCount(spec)).toBe(5);
    expect(result.palette).toHaveLength(5);
    expect(result.svg.match(/attributeName="d"/g) ?? []).toHaveLength(5);
    expect(result.svg).toContain("自然量");
    expect(result.svg).toContain("自然流量");
    expect(result.compatibility.safe).toBe(true);
  });

  it("aggregates treemap categories instead of rendering repeated rows as separate tiles", () => {
    const spec = specFor("treemap", { category: "channel", value: "value" });
    const result = renderAnimatedSvg(spec);

    expect(resolveVisualItemCount(spec)).toBe(5);
    expect(result.palette).toHaveLength(5);
    expect(result.svg.match(/attributeName="width"/g) ?? []).toHaveLength(5);
    expect(result.compatibility.safe).toBe(true);
  });
});
