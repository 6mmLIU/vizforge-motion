import { animate, group, rect, textNode } from "@/lib/motion/svgPrimitives";
import { extractAggregatedPoints, totalPositive } from "@/lib/motion/renderUtils";
import { stagger } from "@/lib/motion/timeline";
import type { VisualSpec } from "@/lib/visual/visualSpec";
import type { VisualTheme } from "@/lib/visual/themes";

type TreemapItem = {
  point: ReturnType<typeof extractAggregatedPoints>[number];
  index: number;
};

type TreemapTile = TreemapItem & {
  x: number;
  y: number;
  width: number;
  height: number;
};

const FONT = "Noto Sans CJK SC, PingFang SC, Microsoft YaHei, Arial, sans-serif";

export function renderTreemap(spec: VisualSpec, theme: VisualTheme): string {
  const points = extractAggregatedPoints(spec, 28)
    .map((point) => ({ ...point, value: Math.max(0, point.value) }))
    .sort((a, b) => b.value - a.value);
  const total = totalPositive(points);
  const tall = theme.id === "editorial-light" && spec.export.height / spec.export.width > 1.15;
  const plot = {
    x: tall ? 58 : 66,
    y: tall ? 220 : 132,
    width: spec.export.width - (tall ? 116 : 132),
    height: spec.export.height - (tall ? 420 : 228)
  };
  const tiles = layoutTreemap(
    points.map((point, index) => ({ point, index })),
    plot
  );

  const tileNodes = tiles
    .map((tile) => {
      const gap = tall ? 7 : 5;
      const x = tile.x + gap / 2;
      const y = tile.y + gap / 2;
      const width = Math.max(0, tile.width - gap);
      const height = Math.max(0, tile.height - gap);
      if (width < 8 || height < 8) return "";

      const point = tile.point;
      const share = point.value / total;
      const color = theme.palette[tile.index % theme.palette.length];
      const delay = stagger(tile.index, spec.motion.delayMs, 46);
      const labelFits = width >= (tall ? 78 : 64) && height >= (tall ? 62 : 48);
      const valueFits = width >= (tall ? 96 : 82) && height >= (tall ? 92 : 68);
      const labelSize = Math.max(tall ? 14 : 11, Math.min(tall ? 22 : 16, width / (point.label.length * 0.74 + 2)));
      const valueSize = Math.max(tall ? 18 : 14, Math.min(tall ? 30 : 22, Math.min(width / 4.8, height / 4.2)));
      const textColor = readableText(color);

      return group(
        rect(
          {
            x,
            y,
            width: Number(width.toFixed(2)),
            height: Number(height.toFixed(2)),
            rx: tall ? 16 : 11,
            fill: color,
            opacity: 0.88,
            stroke: theme.background,
            "stroke-width": tall ? 1.4 : 1
          },
          animate("width", 0, Number(width.toFixed(2)), spec.motion.durationMs, delay, spec.motion)
        ) +
          (labelFits
            ? textNode(point.label.slice(0, width > 150 ? 18 : 10), {
                x: x + (tall ? 16 : 12),
                y: y + (tall ? 29 : 23),
                fill: textColor,
                "font-size": Number(labelSize.toFixed(1)),
                "font-family": FONT,
                "font-weight": 760
              })
            : "") +
          (valueFits
            ? textNode(formatNumber(point.value), {
                x: x + (tall ? 16 : 12),
                y: y + height - (tall ? 24 : 18),
                fill: textColor,
                "font-size": Number(valueSize.toFixed(1)),
                "font-family": FONT,
                "font-weight": 780
              })
            : "") +
          (valueFits
            ? textNode(`${Math.round(share * 100)}%`, {
                x: x + width - (tall ? 16 : 12),
                y: y + height - (tall ? 25 : 18),
                fill: textColor,
                "font-size": tall ? 14 : 11,
                "font-family": FONT,
                "font-weight": 680,
                "text-anchor": "end",
                opacity: 0.8
              })
            : "")
      );
    })
    .join("");

  return group(tileNodes);
}

function layoutTreemap(items: TreemapItem[], rectBox: { x: number; y: number; width: number; height: number }): TreemapTile[] {
  if (!items.length) return [];
  if (items.length === 1) return [{ ...items[0], ...rectBox }];

  const total = sumValues(items);
  let running = 0;
  let splitIndex = 1;
  let bestDistance = Number.POSITIVE_INFINITY;

  for (let index = 0; index < items.length - 1; index += 1) {
    running += Math.max(0, items[index].point.value);
    const distance = Math.abs(total / 2 - running);
    if (distance < bestDistance) {
      bestDistance = distance;
      splitIndex = index + 1;
    }
  }

  const first = items.slice(0, splitIndex);
  const second = items.slice(splitIndex);
  const firstRatio = sumValues(first) / total;

  if (rectBox.width >= rectBox.height) {
    const firstWidth = rectBox.width * firstRatio;
    return [
      ...layoutTreemap(first, { ...rectBox, width: firstWidth }),
      ...layoutTreemap(second, { x: rectBox.x + firstWidth, y: rectBox.y, width: rectBox.width - firstWidth, height: rectBox.height })
    ];
  }

  const firstHeight = rectBox.height * firstRatio;
  return [
    ...layoutTreemap(first, { ...rectBox, height: firstHeight }),
    ...layoutTreemap(second, { x: rectBox.x, y: rectBox.y + firstHeight, width: rectBox.width, height: rectBox.height - firstHeight })
  ];
}

function sumValues(items: TreemapItem[]) {
  const total = items.reduce((sum, item) => sum + Math.max(0, item.point.value), 0);
  return total || 1;
}

function formatNumber(value: number): string {
  return Number.isInteger(value) ? value.toLocaleString("zh-CN") : value.toLocaleString("zh-CN", { maximumFractionDigits: 1 });
}

function readableText(hex: string): string {
  const rgb = hexToRgb(hex);
  if (!rgb) return "#ffffff";
  const luminance = (0.2126 * rgb.r + 0.7152 * rgb.g + 0.0722 * rgb.b) / 255;
  return luminance > 0.62 ? "#0f172a" : "#ffffff";
}

function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const value = hex.trim().replace(/^#/, "");
  if (value.length !== 6) return null;
  const r = parseInt(value.slice(0, 2), 16);
  const g = parseInt(value.slice(2, 4), 16);
  const b = parseInt(value.slice(4, 6), 16);
  if ([r, g, b].some(Number.isNaN)) return null;
  return { r, g, b };
}
