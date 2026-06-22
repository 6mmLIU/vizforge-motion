import { coerceNumber } from "@/lib/data/inferSchema";
import { animate, group, path, rect, textNode } from "@/lib/motion/svgPrimitives";
import { resolveFields } from "@/lib/motion/renderUtils";
import { stagger } from "@/lib/motion/timeline";
import type { VisualSpec } from "@/lib/visual/visualSpec";
import type { VisualTheme } from "@/lib/visual/themes";

export function renderSankey(spec: VisualSpec, theme: VisualTheme): string {
  const fields = resolveFields(spec);
  const sourceField = spec.mappings?.source ?? "source";
  const targetField = spec.mappings?.target ?? "target";
  const valueField = fields.value;
  const links = spec.data.rows.slice(0, 200).map((row, index) => ({
    source: labelFor(row[sourceField] ?? row[fields.category], `Source ${index + 1}`),
    target: labelFor(row[targetField], `Target ${index + 1}`),
    value: Math.max(1, coerceNumber(row[valueField]) ?? 1)
  }));
  const sources = Array.from(new Set(links.map((link) => link.source)));
  const targets = Array.from(new Set(links.map((link) => link.target)));
  const tall = theme.id === "editorial-light" && spec.export.height / spec.export.width > 1.15;
  const plot = { x: 92, y: tall ? 190 : 136, width: spec.export.width - 184, height: spec.export.height - (tall ? 318 : 240) };
  const max = Math.max(...links.map((link) => link.value), 1);
  const nodeCount = Math.max(sources.length, targets.length, 1);
  const nodeHeight = Math.max(2, Math.min(32, (plot.height / nodeCount) * 0.48));
  const sourceLabelEvery = sources.length <= 16 ? 1 : Math.ceil(sources.length / 16);
  const targetLabelEvery = targets.length <= 16 ? 1 : Math.ceil(targets.length / 16);
  const linkOpacity = links.length > 80 ? 0.34 : links.length > 40 ? 0.46 : 0.58;
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
            ? textNode(name.slice(0, 14), { x: plot.x - 18, y: Number((y + 4).toFixed(2)), fill: theme.muted, "font-size": sources.length > 24 ? 9 : 12, "font-family": "Inter, Microsoft YaHei, PingFang SC, Arial, sans-serif", "text-anchor": "end" })
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
            ? textNode(name.slice(0, 14), { x: plot.x + plot.width + 18, y: Number((y + 4).toFixed(2)), fill: theme.muted, "font-size": targets.length > 24 ? 9 : 12, "font-family": "Inter, Microsoft YaHei, PingFang SC, Arial, sans-serif" })
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
          "stroke-width": Number((Math.max(1, Math.min(3, nodeHeight * 0.8)) + (link.value / max) * Math.min(18, Math.max(5, nodeHeight * 1.8))).toFixed(2)),
          "stroke-linecap": "round",
          opacity: linkOpacity,
          "stroke-dasharray": length,
          "stroke-dashoffset": 0
        },
        animate("stroke-dashoffset", length, 0, spec.motion.durationMs, delay, spec.motion)
      );
    })
    .join("");

  return group(linkPaths + nodeRects);
}

function labelFor(value: unknown, fallback: string): string {
  const text = value === undefined || value === null ? "" : String(value).trim();
  return text || fallback;
}
