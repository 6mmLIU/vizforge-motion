import { inferSchema } from "@/lib/data/inferSchema";
import { describe, expect, it } from "vitest";

describe("inferSchema", () => {
  it("infers number, date, and category columns", () => {
    const schema = inferSchema([
      { month: "2026-01", channel: "Search", value: "42" },
      { month: "2026-02", channel: "Social", value: "31" }
    ]);
    expect(schema.find((column) => column.name === "month")?.type).toBe("date");
    expect(schema.find((column) => column.name === "channel")?.type).toBe("category");
    expect(schema.find((column) => column.name === "value")?.type).toBe("number");
  });
});
