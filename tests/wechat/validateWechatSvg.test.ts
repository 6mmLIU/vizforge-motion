import { validateWechatSvg } from "@/lib/wechat/validateWechatSvg";
import { describe, expect, it } from "vitest";

const safeSvg = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 10 10"><rect x="0" y="0" width="10" height="10"><animate attributeName="height" from="0" to="10" dur="1s" /></rect></svg>';

describe("validateWechatSvg", () => {
  it("accepts a basic safe SVG", () => {
    const result = validateWechatSvg(safeSvg);
    expect(result.safe).toBe(true);
    expect(result.score).toBeGreaterThan(80);
  });

  it("detects script and foreignObject", () => {
    const result = validateWechatSvg('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 10 10"><script>alert(1)</script><foreignObject /></svg>');
    expect(result.safe).toBe(false);
    expect(result.issues.map((issue) => issue.code)).toContain("ERROR_SCRIPT_TAG");
    expect(result.issues.map((issue) => issue.code)).toContain("ERROR_FOREIGNOBJECT_TAG");
  });

  it("detects event handlers", () => {
    const result = validateWechatSvg('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 10 10"><rect onclick="x()" /></svg>');
    expect(result.safe).toBe(false);
    expect(result.issues.map((issue) => issue.code)).toContain("ERROR_EVENT_HANDLER");
  });
});
