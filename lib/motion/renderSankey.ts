import { coerceNumber } from "@/lib/data/inferSchema";
import { animate, group, path, rect, textNode } from "@/lib/motion/svgPrimitives";
import { extractAggregatedPoints, resolveFields } from "@/lib/motion/renderUtils";
import { stagger } from "@/lib/motion/timeline";
import type { VisualSpec } from "@/lib/visual/visualSpec";
import type { VisualTheme } from "@/lib/visual/themes";

export function renderSankey(spec: VisualSpec, theme: VisualTheme): string {
  const fields = resolveFields(spec);
  const sourceField = spec.mappings?.source ?? "source";
  const targetField = spec.mappings?.target ?? "target";
  const valueField = fields.value;
  const hasExplicitFlowFields = spec.data.rows.some((row) => hasText(row[sourceField]) && hasText(row[targetField]));
  const links = hasExplicitFlowFields
    ? spec.data.rows.slice(0, 200).map((row, index) => ({
        source: labelFor(row[sourceField] ?? row[fields.category], `Source ${index + 1}`),
        target: labelFor(row[targetField], `Target ${index + 1}`),
        value: Math.max(1, coerceNumber(row[valueField]) ?? 1)
      }))
    : extractAggregatedPoints(spec, 24).map((point) => ({
        source: "总量",
        target: point.label,
        value: Math.max(1, point.value)
      }));
  const sources = Array.from(new Set(links.map((link) => link.source)));
  const targets = Array.from(new Set(links.map((link) => link.target)));
  const tall = theme.id === "editorial-light" && spec.export.height / spec.export.width > 1.15;
  const plot = { x: tall ? 112 : 92, y: tall ? 230 : 136, width: spec.export.width - (tall ? 224 : 184), height: spec.export.height - (tall ? 470 : 240) };
  const max = Math.max(...links.map((link) => link.value), 1);
  const nodeCount = Math.max(sources.length, targets.length, 1);
  const nodeHeight = Math.max(2, Math.min(tall ? 38 : 32, (plot.height / nodeCount) * (tall ? 0.58 : 0.48)));
  const sourceLabelEvery = sources.length <= 16 ? 1 : Math.ceil(sources.length / 16);
  const targetLabelEvery = targets.length <= 16 ? 1 : Math.ceil(targets.length / 16);
  const linkOpacity = links.length > 80 ? 0.34 : links.length > 40 ? 0.48 : tall ? 0.66 : 0.58;
  const linkDelayStep = Math.max(8, Math.min(65, 1300 / Math.max(links.length, 1)));
  const sourceY = (name: string) => plot.y + (plot.height / Math.max(1, sources.length - 1)) * Math.max(0, sources.indexOf(name));
  const targetY = (name: string) => plot.y + (plot.height / Math.max(1, targets.length - 1)) * Math.max(0, targets.indexOf(name));

  const nodeRects =
    sources
      .map((name, index) => {
        const y = sourceY(name);
        return (
          rect({ x: plot.x - 8, y: Number((y - nodeHeight / 2).toFixed(2)), width: 16, height: Number(nodeHeight.toFixed(2)), rx: Math.min(7, nodeHeight / 2), fill: theme.palette[index % theme.palette.length], opacity: 0.82 }) +
          (index % sourceLabelEvery === 0
            ? textNode(name.slice(0, 10), {
                x: plot.x - 22,
                y: Number((y + 5).toFixed(2)),
                fill: theme.text,
                "font-size": sources.length > 24 ? (tall ? 10 : 9) : tall ? 14 : 12,
                "font-family": "Noto Sans CJK SC, PingFang SC, Microsoft YaHei, Arial, sans-serif",
                "font-weight": tall ? 650 : undefined,
                "text-anchor": "end"
              })
            : "")
        );
      })
      .join("") +
    targets
      .map((name, index) => {
        const y = targetY(name);
        return (
          rect({ x: plot.x + plot.width - 8, y: Number((y - nodeHeight / 2).toFixed(2)), width: 16, height: Number(nodeHeight.toFixed(2)), rx: Math.min(7, nodeHeight / 2), fill: theme.palette[(index + sources.length) % theme.palette.length], opacity: 0.82 }) +
          (index % targetLabelEvery === 0
            ? textNode(name.slice(0, 10), {
                x: plot.x + plot.width + 22,
                y: Number((y + 5).toFixed(2)),
                fill: theme.text,
                "font-size": targets.length > 24 ? (tall ? 10 : 9) : tall ? 14 : 12,
                "font-family": "Noto Sans CJK SC, PingFang SC, Microsoft YaHei, Arial, sans-serif",
                "font-weight": tall ? 650 : undefined
              })
            : "")
        );
      })
      .join("");

  const linkPaths = links
    .map((link, index) => {
      const y1 = sourceY(link.source);
      const y2 = targetY(link.target);
      const d = `M ${plot.x} ${y1.toFixed(2)} C ${plot.x + plot.width * 0.42} ${y1.toFixed(2)}, ${plot.x + plot.width * 0.58} ${y2.toFixed(2)}, ${plot.x + plot.width} ${y2.toFixed(2)}`;
      const length = Math.round(plot.width * 1.15);
      const delay = stagger(index, spec.motion.delayMs, linkDelayStep);
      return path(
        {
          d,
          fill: "none",
          stroke: theme.palette[index % theme.palette.length],
          "stroke-width": Number((Math.max(tall ? 2.4 : 1, Math.min(tall ? 5 : 3, nodeHeight * 0.8)) + (link.value / max) * Math.min(tall ? 26 : 18, Math.max(5, nodeHeight * 1.8))).toFixed(2)),
          "stroke-linecap": "round",
          opacity: linkOpacity,
          "stroke-dasharray": length,
          "stroke-dashoffset": 0
        },
        animate("stroke-dashoffset", length, 0, spec.motion.durationMs, delay, spec.motion)
      );
    })
    .join("");

  const headers = tall
    ? textNode("来源", {
        x: plot.x,
        y: plot.y - 30,
        fill: "#697386",
        "font-size": 14,
        "font-family": "Noto Sans CJK SC, PingFang SC, Microsoft YaHei, Arial, sans-serif",
        "font-weight": 650
      }) +
      textNode("去向", {
        x: plot.x + plot.width,
        y: plot.y - 30,
        fill: "#697386",
        "font-size": 14,
        "font-family": "Noto Sans CJK SC, PingFang SC, Microsoft YaHei, Arial, sans-serif",
        "font-weight": 650,
        "text-anchor": "end"
      })
    : "";

  return group(headers + linkPaths + nodeRects);
}

function labelFor(value: unknown, fallback: string): string {
  const text = value === undefined || value === null ? "" : String(value).trim();
  return text || fallback;
}

function hasText(value: unknown): boolean {
  return value !== undefined && value !== null && String(value).trim() !== "";
}
