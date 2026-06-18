import sharp from "sharp";

export type ImageExportFormat = "png" | "webp" | "jpeg";

export type RenderedImage = {
  buffer: Buffer;
  contentType: `image/${ImageExportFormat}`;
  extension: ImageExportFormat;
};

export async function svgToImage(svg: string, format: ImageExportFormat): Promise<RenderedImage> {
  const image = sharp(Buffer.from(svg));
  const buffer =
    format === "webp"
      ? await image.webp({ quality: 92 }).toBuffer()
      : format === "jpeg"
        ? await image.jpeg({ quality: 92 }).toBuffer()
        : await image.png().toBuffer();

  return {
    buffer,
    contentType: `image/${format}`,
    extension: format
  };
}
