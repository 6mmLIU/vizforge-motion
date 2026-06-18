import { parseJson } from "@/lib/data/parseJson";
import { describe, expect, it } from "vitest";

describe("parseJson", () => {
  it("parses an array of objects", () => {
    const result = parseJson('[{"name":"Search","value":42}]');
    expect(result.rows).toEqual([{ name: "Search", value: 42 }]);
  });

  it("stringifies nested values safely", () => {
    const result = parseJson('[{"name":"Search","meta":{"paid":true}}]');
    expect(result.rows[0].meta).toBe('{"paid":true}');
    expect(result.warnings[0]).toContain("stringified");
  });
});
