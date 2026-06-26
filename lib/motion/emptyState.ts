import { textNode, rect, group } from "@/lib/motion/svgPrimitives";
import { FONT, clamp, round, type Geom, type Rect } from "@/lib/motion/layout";
import type { VisualTheme } from "@/lib/visual/themes";

export type EmptyStateKind = "empty" | "insufficient" | "non-numeric" | "single-point";

export function describeEmptyState(spec: { data: { rows: unknown[] }; type: string; mappings?: Record<string, string | undefined> }): {
  kind: EmptyStateKind;
  message: string;
  hint: string;
} | null {
  const rows = spec.data.rows;
  if (!rows.length) {
    return {
      kind: "empty",
      message: "暂无可渲染的数据",
      hint: "请在左侧粘贴 CSV、JSON 或表格，至少一行有效数据。"
    };
  }
  if (rows.length < 2 && spec.type !== "metric-card") {
    return {
      kind: "single-point",
      message: "数据只有 1 行",
      hint: "趋势、对比类图表至少需要 2 行数据才能呈现规律。"
    };
  }
  return null;
}

export function renderEmptyState(theme: VisualTheme, g: Geom, state: { message: string; hint: string }): string {
  const plot: Rect = g.plot;
  const card = rect({
    x: round(plot.x),
    y: round(plot.y),
    width: round(plot.width),
    height: round(plot.height),
    rx: round(clamp(g.radius * 0.6, 12, 20)),
    fill: theme.header,
    stroke: theme.border,
    "stroke-width": 1,
    "stroke-dasharray": "6 6"
  });
  const cx = plot.x + plot.width / 2;
  const cy = plot.y + plot.height / 2;
  const titleSize = Math.round(clamp(g.s * 18, 14, 22));
  const hintSize = Math.round(clamp(g.s * 13, 11, 15));
  const title = textNode(state.message, {
    x: round(cx),
    y: round(cy - titleSize * 0.4),
    fill: theme.muted,
    "font-size": titleSize,
    "font-family": FONT,
    "font-weight": 640,
    "text-anchor": "middle"
  });
  const hint = textNode(state.hint, {
    x: round(cx),
    y: round(cy + hintSize * 1.4),
    fill: theme.soft,
    "font-size": hintSize,
    "font-family": FONT,
    "text-anchor": "middle"
  });
  return group(card + title + hint);
}
