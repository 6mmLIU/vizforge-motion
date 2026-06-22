import { svgToImage } from "@/lib/render/svgToImage";
import sharp from "sharp";
import { describe, expect, it } from "vitest";

describe("svgToImage", () => {
  it("converts safe SVG to PNG buffer", async () => {
    const image = await svgToImage('<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 20 20"><rect width="20" height="20" fill="#0a84ff"/></svg>', "png");
    expect(image.contentType).toBe("image/png");
    expect(image.buffer.length).toBeGreaterThan(20);
  });

  it("keeps self-closing tags valid when freezing animated elements", async () => {
    const svg =
      '<svg xmlns="http://www.w3.org/2000/svg" width="40" height="20" viewBox="0 0 40 20"><rect x="0" y="0" width="40" height="20" fill="#fff"/><rect x="0" y="4" width="0" height="12" fill="#0a84ff"><animate attributeName="width" from="0" to="32" dur="0.8s" fill="freeze"/></rect></svg>';
    const image = await svgToImage(svg, "png");
    expect(image.contentType).toBe("image/png");
    expect(image.buffer.length).toBeGreaterThan(20);
  });

  it("exports higher-density PNGs without changing the SVG layout", async () => {
    const image = await svgToImage('<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 20 20"><rect width="20" height="20" fill="#0a84ff"/></svg>', "png", {
      pixelRatio: 2
    });
    const metadata = await sharp(image.buffer).metadata();

    expect(image.pixelRatio).toBe(2);
    expect(image.width).toBe(40);
    expect(image.height).toBe(40);
    expect(metadata.width).toBe(40);
    expect(metadata.height).toBe(40);
  });
});
