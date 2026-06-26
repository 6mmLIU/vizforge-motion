import { animate, group, rect, textNode } from "@/lib/motion/svgPrimitives";
import { extractAggregatedPoints, totalPositive, type Point } from "@/lib/motion/renderUtils";
import { stagger } from "@/lib/motion/timeline";
import { FONT, clamp, colorFor, formatNumber, readableOn, round, type Geom, type Rect } from "@/lib/motion/layout";
import type { VisualSpec } from "@/lib/visual/visualSpec";
import type { VisualTheme } from "@/lib/visual/themes";

type Item = { point: Point; index: number };
type Tile = Item & Rect;

export function renderTreemap(spec: VisualSpec, theme: VisualTheme, g: Geom): string {
  const points = extractAggregatedPoints(spec, 28)
    .map((point) => ({ ...point, value: Math.max(0, point.value) }))
    .sort((a, b) => b.value - a.value);
  const total = totalPositive(points);
  const tiles = layout(points.map((point, index) => ({ point, index })), g.plot);
  const gap = round(6 * g.s);

  if (total <= 0) {
    const emptyTile = rect({ x: round(g.plot.x), y: round(g.plot.y), width: round(g.plot.width), height: round(g.plot.height), rx: round(12 * g.s), fill: theme.header, stroke: theme.border, "stroke-width": 1, "stroke-dasharray": "6 6" });
    const label = textNode("暂无有效数值", {
      x: round(g.plot.x + g.plot.width / 2),
      y: round(g.plot.y + g.plot.height / 2),
      fill: theme.muted,
      "font-size": Math.round(16 * g.s),
      "font-family": FONT,
      "font-weight": 600,
      "text-anchor": "middle"
    });
    return group(emptyTile + label);
  }

  return group(
    tiles
      .map((tile) => {
        const x = tile.x + gap / 2;
        const y = tile.y + gap / 2;
        const width = Math.max(0, tile.width - gap);
        const height = Math.max(0, tile.height - gap);
        if (width < 10 || height < 10) return "";
        const color = colorFor(theme, tile.index);
        const ink = readableOn(color);
        const share = tile.point.value / total;
        const delay = stagger(tile.index, spec.motion.delayMs, 48);
        const labelFits = width >= 70 && height >= 46;
        const valueFits = width >= 88 && height >= 66;
        const labelSize = Math.round(clamp(width / (tile.point.label.length * 0.72 + 2), 11, 20 * g.s));
        const valueSize = Math.round(clamp(Math.min(width / 4.6, height / 4), 14, 28 * g.s));
        return group(
          rect(
            {
              x: round(x),
              y: round(y),
              width: round(width),
              height: round(height),
              rx: round(12 * g.s),
              fill: color,
              opacity: 0.94
            },
            animate("width", 0, round(width), spec.motion.durationMs, delay, spec.motion)
          ) +
            (labelFits
              ? textNode(tile.point.label.slice(0, width > 160 ? 18 : 10), {
                  x: round(x + round(14 * g.s)),
                  y: round(y + round(26 * g.s)),
                  fill: ink,
                  "font-size": labelSize,
                  "font-family": FONT,
                  "font-weight": 740
                })
              : "") +
            (valueFits
              ? textNode(formatNumber(tile.point.value), {
                  x: round(x + round(14 * g.s)),
                  y: round(y + height - round(16 * g.s)),
                  fill: ink,
                  "font-size": valueSize,
                  "font-family": FONT,
                  "font-weight": 780
                })
              : "") +
            (valueFits
              ? textNode(`${Math.round(share * 100)}%`, {
                  x: round(x + width - round(14 * g.s)),
                  y: round(y + height - round(16 * g.s)),
                  fill: ink,
                  "font-size": Math.round(12 * g.s),
                  "font-family": FONT,
                  "font-weight": 680,
                  "text-anchor": "end",
                  opacity: 0.82
                })
              : "")
        );
      })
      .join("")
  );
}

function layout(items: Item[], box: Rect): Tile[] {
  if (!items.length) return [];
  if (items.length === 1) return [{ ...items[0], ...box }];
  const total = sum(items);
  let running = 0;
  let splitIndex = 1;
  let best = Number.POSITIVE_INFINITY;
  for (let index = 0; index < items.length - 1; index += 1) {
    running += Math.max(0, items[index].point.value);
    const distance = Math.abs(total / 2 - running);
    if (distance < best) {
      best = distance;
      splitIndex = index + 1;
    }
  }
  const first = items.slice(0, splitIndex);
  const second = items.slice(splitIndex);
  const firstRatio = sum(first) / total;
  if (box.width >= box.height) {
    const firstWidth = box.width * firstRatio;
    return [
      ...layout(first, { ...box, width: firstWidth }),
      ...layout(second, { x: box.x + firstWidth, y: box.y, width: box.width - firstWidth, height: box.height })
    ];
  }
  const firstHeight = box.height * firstRatio;
  return [
    ...layout(first, { ...box, height: firstHeight }),
    ...layout(second, { x: box.x, y: box.y + firstHeight, width: box.width, height: box.height - firstHeight })
  ];
}

function sum(items: Item[]): number {
  return items.reduce((acc, item) => acc + Math.max(0, item.point.value), 0) || 1;
}
