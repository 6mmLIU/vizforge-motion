import { parseCsv } from "@/lib/data/parseCsv";
import { describe, expect, it } from "vitest";

describe("parseCsv", () => {
  it("parses headers and data rows", () => {
    const result = parseCsv("name,value\nSearch,42\nSocial,31");
    expect(result.rows).toEqual([
      { name: "Search", value: "42" },
      { name: "Social", value: "31" }
    ]);
    expect(result.warnings).toEqual([]);
  });

  it("handles quoted commas", () => {
    const result = parseCsv('name,value\n"Search, paid",42');
    expect(result.rows[0].name).toBe("Search, paid");
  });
});
