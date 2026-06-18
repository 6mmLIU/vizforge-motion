import { textNode } from "@/lib/motion/svgPrimitives";
import type { VisualTheme } from "@/lib/visual/themes";

const SVG_FONT = "Inter, Microsoft YaHei, PingFang SC, Arial, sans-serif";

export function cardTitle(title: string, subtitle: string | undefined, theme: VisualTheme): string {
  if (theme.id === "editorial-light") {
    const titleNode = textNode(title, {
      x: 40,
      y: 64,
      fill: theme.text,
      "font-size": theme.typography.title,
      "font-family": SVG_FONT,
      "font-weight": 650
    });
    const subtitleNode = subtitle
      ? textNode(subtitle, {
          x: 40,
          y: 92,
          fill: theme.muted,
          "font-size": theme.typography.subtitle,
          "font-family": SVG_FONT
        })
      : "";

    return titleNode + subtitleNode;
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

export function footerText(caption: string | undefined, source: string | undefined, theme: VisualTheme, height: number): string {
  if (theme.id === "editorial-light") return "";

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
