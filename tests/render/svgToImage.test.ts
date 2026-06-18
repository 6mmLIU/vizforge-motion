import { svgToImage } from "@/lib/render/svgToImage";
import { describe, expect, it } from "vitest";

describe("svgToImage", () => {
  it("converts safe SVG to PNG buffer", async () => {
    const image = await svgToImage('<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 20 20"><rect width="20" height="20" fill="#0a84ff"/></svg>', "png");
    expect(image.contentType).toBe("image/png");
    expect(image.buffer.length).toBeGreaterThan(20);
  });
});
