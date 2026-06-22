import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";

export type ImageExportFormat = "png" | "webp" | "jpeg";

export type RenderedImage = {
  buffer: Buffer;
  contentType: `image/${ImageExportFormat}`;
  extension: ImageExportFormat;
};

const CJK_FONT_FILE = "NotoSansCJKsc-Regular.otf";
const CJK_FONT_URL = "https://raw.githubusercontent.com/notofonts/noto-cjk/main/Sans/OTF/SimplifiedChinese/NotoSansCJKsc-Regular.otf";

let fontConfigReady = false;
let fontFilePromise: Promise<string | null> | null = null;
let sharpPromise: Promise<typeof import("sharp")> | null = null;

export async function svgToImage(svg: string, format: ImageExportFormat): Promise<RenderedImage> {
  const sharp = await loadSharp();
  const image = sharp(Buffer.from(staticSafeSvg(svg)));
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

async function loadSharp() {
  await configureCjkFont();
  sharpPromise ??= import("sharp");
  return (await sharpPromise).default;
}

async function configureCjkFont() {
  if (fontConfigReady) return;

  const fontFile = await resolveCjkFontFile();
  if (!fontFile) {
    fontConfigReady = true;
    return;
  }

  const cacheDir = join(tmpdir(), "vizforge-fontconfig-cache");
  mkdirSync(cacheDir, { recursive: true });
  const configFile = join(tmpdir(), "vizforge-fonts.conf");
  writeFileSync(configFile, fontConfigXml(dirname(fontFile), cacheDir), "utf8");

  process.env.FONTCONFIG_FILE = configFile;
  process.env.FONTCONFIG_PATH = dirname(fontFile);
  process.env.FONTCONFIG_CACHE = cacheDir;
  fontConfigReady = true;
}

async function resolveCjkFontFile(): Promise<string | null> {
  const bundled = join(process.cwd(), "fonts", CJK_FONT_FILE);
  if (existsSync(bundled)) return bundled;

  const cached = join(tmpdir(), "vizforge-fonts", CJK_FONT_FILE);
  if (existsSync(cached)) return cached;

  fontFilePromise ??= downloadCjkFont(cached);
  return fontFilePromise;
}

async function downloadCjkFont(target: string): Promise<string | null> {
  try {
    const response = await fetch(CJK_FONT_URL);
    if (!response.ok) return null;
    const bytes = Buffer.from(await response.arrayBuffer());
    mkdirSync(dirname(target), { recursive: true });
    await writeFile(target, bytes);
    return target;
  } catch {
    return null;
  }
}

function fontConfigXml(fontDir: string, cacheDir: string) {
  const aliases = ["Inter", "Arial", "Microsoft YaHei", "PingFang SC", "Noto Sans SC", "sans-serif"]
    .map(
      (family) => `
  <alias>
    <family>${xmlEscape(family)}</family>
    <prefer><family>Noto Sans CJK SC</family></prefer>
  </alias>`
    )
    .join("");

  return `<?xml version="1.0"?>
<!DOCTYPE fontconfig SYSTEM "fonts.dtd">
<fontconfig>
  <dir>${xmlEscape(fontDir)}</dir>
  <cachedir>${xmlEscape(cacheDir)}</cachedir>
  <match target="pattern">
    <edit name="family" mode="prepend" binding="strong">
      <string>Noto Sans CJK SC</string>
    </edit>
  </match>
${aliases}
</fontconfig>
`;
}

function xmlEscape(value: string) {
  return value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;");
}

function staticSafeSvg(svg: string) {
  return ["rect", "circle", "path", "polygon", "text", "line"].reduce((output, tagName) => {
    return output.replace(new RegExp(`<${tagName}\\b((?:"[^"]*"|'[^']*'|[^'">])*)(?<!/)>([\\s\\S]*?)<\\/${tagName}>`, "g"), (match, attributes: string, children: string) => {
      let nextAttributes = attributes;
      for (const attributeName of ["width", "height", "y", "opacity", "stroke-dashoffset", "points"]) {
        const finalValue = animatedToValue(children, attributeName);
        if (finalValue !== null) {
          nextAttributes = setSvgAttribute(nextAttributes, attributeName, finalValue);
        }
      }
      return `<${tagName}${nextAttributes}>${children}</${tagName}>`;
    });
  }, svg).replaceAll('transform="scale(0)"', 'transform="scale(1)"');
}

function animatedToValue(children: string, attributeName: string) {
  const pattern = new RegExp(`<animate\\b(?=[^>]*attributeName="${attributeName}")[^>]*\\bto="([^"]+)"`, "i");
  return children.match(pattern)?.[1] ?? null;
}

function setSvgAttribute(attributes: string, name: string, value: string) {
  const escaped = value.replaceAll('"', "&quot;");
  const pattern = new RegExp(`\\s${name}="[^"]*"`);
  if (pattern.test(attributes)) return attributes.replace(pattern, ` ${name}="${escaped}"`);
  return `${attributes} ${name}="${escaped}"`;
}
