import { DEFAULT_VISUAL_SPEC, VisualSpecSchema } from "@/lib/visual/visualSpec";
import { describe, expect, it } from "vitest";

describe("VisualSpecSchema", () => {
  it("accepts the default VisualSpec", () => {
    expect(VisualSpecSchema.safeParse(DEFAULT_VISUAL_SPEC).success).toBe(true);
  });

  it("rejects arbitrary visual types", () => {
    const result = VisualSpecSchema.safeParse({ ...DEFAULT_VISUAL_SPEC, type: "raw-html" });
    expect(result.success).toBe(false);
  });

  it("normalizes optional card fields and drops incomplete metrics", () => {
    const result = VisualSpecSchema.safeParse({
      ...DEFAULT_VISUAL_SPEC,
      card: {
        periodLabel: "",
        metrics: [
          { label: "周销售额", value: "28,441", prefix: "$", delta: "3.3%", trend: "" },
          { label: "", value: 100, trend: "up" },
          { label: "缺值指标", trend: "down" },
          { label: "总销量", value: 278, delta: "3.3%", trend: "up" }
        ]
      }
    });

    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.data.card?.periodLabel).toBeUndefined();
    expect(result.data.card?.metrics).toHaveLength(2);
    expect(result.data.card?.metrics?.[0]).toEqual({
      label: "周销售额",
      value: "28,441",
      prefix: "$",
      delta: "3.3%"
    });
    expect(result.data.card?.metrics?.[1]?.trend).toBe("up");
  });

  it("accepts API palettes longer than the old 12-color template limit", () => {
    const result = VisualSpecSchema.safeParse({
      ...DEFAULT_VISUAL_SPEC,
      palette: Array.from({ length: 20 }, (_, index) => `#${(index + 1).toString(16).padStart(6, "0")}`)
    });

    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.data.palette).toHaveLength(20);
  });
});
