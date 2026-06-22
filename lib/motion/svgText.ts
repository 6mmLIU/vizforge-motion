import { rect, textNode } from "@/lib/motion/svgPrimitives";
import type { VisualTheme } from "@/lib/visual/themes";

const SVG_FONT = "Inter, Microsoft YaHei, PingFang SC, Arial, sans-serif";

export function cardTitle(title: string, subtitle: string | undefined, theme: VisualTheme, width = 720, height = 500): string {
  if (theme.id === "editorial-light") {
    const tall = height / width > 1.15;
    const x = tall ? 52 : 40;
    const y = tall ? 76 : 64;
    const titleSize = tall ? 32 : theme.typography.title;
    const titleLines = wrapText(title, width - x * 2 - (tall ? 0 : 180), titleSize, tall ? 2 : 1);
    const titleNode = titleLines
      .map((line, index) =>
        textNode(line, {
          x,
          y: y + index * titleSize * 1.16,
          fill: theme.text,
          "font-size": titleSize,
          "font-family": SVG_FONT,
          "font-weight": 760
        })
      )
      .join("");
    const subtitleY = y + Math.max(1, titleLines.length) * titleSize * 1.16 + (tall ? 18 : 8);
    const subtitleNode = subtitle
      ? textNode(subtitle, {
          x,
          y: Number(subtitleY.toFixed(2)),
          fill: theme.muted,
          "font-size": tall ? 16 : theme.typography.subtitle,
          "font-family": SVG_FONT
        })
      : "";
    const accentRule = rect({
      x,
      y: tall ? 44 : 36,
      width: tall ? 48 : 38,
      height: tall ? 5 : 4,
      rx: 3,
      fill: theme.accent
    });

    return accentRule + titleNode + subtitleNode;
  }

  const titleNode = textNode(title, {
    x: 48,
    y: 62,
    fill: theme.text,
    "font-size": theme.typography.title,
    "font-family": SVG_FONT,
    "font-weight": 760
  });

  const subtitleNode = subtitle
    ? textNode(subtitle, {
        x: 50,
        y: 92,
        fill: theme.muted,
        "font-size": theme.typography.subtitle,
        "font-family": SVG_FONT
      })
    : "";

  return titleNode + subtitleNode;
}

export function footerText(caption: string | undefined, source: string | undefined, theme: VisualTheme, widthOrHeight: number, maybeHeight?: number): string {
  const height = maybeHeight ?? widthOrHeight;
  const width = maybeHeight ? widthOrHeight : 720;

  if (theme.id === "editorial-light") {
    const tall = height / width > 1.15;
    const x = tall ? 52 : 40;
    const y = height - (tall ? 48 : 34);
    const captionNode = caption
      ? textNode(fitText(caption, width - x * 2 - (source ? 150 : 0), tall ? 13 : 12), {
          x,
          y,
          fill: theme.muted,
          opacity: 0.92,
          "font-size": tall ? 13 : 12,
          "font-family": SVG_FONT
        })
      : "";
    const sourceNode = source
      ? textNode(fitText(source, 130, 12), {
          x: width - x,
          y,
          fill: theme.muted,
          opacity: 0.76,
          "font-size": 12,
          "font-family": SVG_FONT,
          "text-anchor": "end"
        })
      : "";
    return captionNode + sourceNode;
  }

  const captionNode = caption
    ? textNode(caption, {
        x: 48,
        y: height - 34,
        fill: theme.muted,
        "font-size": theme.typography.label,
        "font-family": SVG_FONT
      })
    : "";
  const sourceNode = source
    ? textNode(source, {
        x: 48,
        y: height - 14,
      fill: theme.muted,
      opacity: 0.72,
      "font-size": 11,
      "font-family": SVG_FONT
      })
    : "";

  return captionNode + sourceNode;
}

function wrapText(text: string, available: number, fontSize: number, maxLines: number): string[] {
  const chars = [...text.trim()];
  if (!chars.length) return [""];
  const lines: string[] = [];
  let current = "";

  chars.forEach((char) => {
    const next = current + char;
    if (current && estimatedTextWidth(next, fontSize) > available && lines.length < maxLines - 1) {
      lines.push(current);
      current = char;
      return;
    }
    current = next;
  });

  if (current) lines.push(current);
  if (lines.length <= maxLines) return lines;

  const kept = lines.slice(0, maxLines);
  kept[maxLines - 1] = fitText(kept[maxLines - 1], available, fontSize);
  return kept;
}

function fitText(text: string, available: number, fontSize: number): string {
  if (estimatedTextWidth(text, fontSize) <= available) return text;
  const suffix = "...";
  let output = "";
  for (const char of [...text]) {
    if (estimatedTextWidth(output + char + suffix, fontSize) > available) break;
    output += char;
  }
  return output ? `${output}${suffix}` : suffix;
}

function estimatedTextWidth(value: string, fontSize: number): number {
  return [...value].reduce((width, char) => width + estimatedCharWidth(char, fontSize), 0);
}

function estimatedCharWidth(char: string, fontSize: number): number {
  if (/[\u2e80-\u9fff\uff00-\uffef]/u.test(char)) return fontSize;
  if (/\s/u.test(char)) return fontSize * 0.34;
  if (/[A-Z0-9]/u.test(char)) return fontSize * 0.64;
  if (/[a-z]/u.test(char)) return fontSize * 0.56;
  return fontSize * 0.5;
}
