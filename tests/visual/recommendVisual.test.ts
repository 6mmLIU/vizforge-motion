import { recommendVisual } from "@/lib/visual/recommendVisual";
import { describe, expect, it } from "vitest";

const monthlyChannelRows = [
  { month: "2026-01", channel: "自然流量", value: 29 },
  { month: "2026-02", channel: "付费广告", value: 52 },
  { month: "2026-03", channel: "自然流量", value: 34 },
  { month: "2026-04", channel: "小红书", value: 16 }
];

describe("recommendVisual", () => {
  it("maps requested treemap charts to the composition category instead of the date axis", () => {
    const recommendation = recommendVisual(monthlyChannelRows, { type: "treemap" });
    expect(recommendation.type).toBe("treemap");
    expect(recommendation.story).toBe("part-to-whole");
    expect(recommendation.mappings.category).toBe("channel");
    expect(recommendation.mappings.value).toBe("value");
  });

  it("keeps a real series field for requested stacked bar charts", () => {
    const stacked = recommendVisual(monthlyChannelRows, { type: "stacked-bar" });
    expect(stacked.mappings.category).toBe("month");
    expect(stacked.mappings.series).toBe("channel");
  });

  it("maps requested heatmaps to the time axis while preserving the category as series context", () => {
    const recommendation = recommendVisual(monthlyChannelRows, { type: "heatmap" });
    expect(recommendation.type).toBe("heatmap");
    expect(recommendation.story).toBe("change-over-time");
    expect(recommendation.mappings.category).toBe("month");
    expect(recommendation.mappings.series).toBe("channel");
  });

  it("recommends a line chart when a date and value field are present", () => {
    const recommendation = recommendVisual([
      { month: "2026-01", value: 20 },
      { month: "2026-02", value: 32 }
    ]);
    expect(recommendation.type).toBe("line");
    expect(recommendation.story).toBe("change-over-time");
  });
});
