import { tag } from "@/lib/motion/svgPrimitives";
import type { VisualTheme } from "@/lib/visual/themes";

export function linearGradient(id: string, stops: Array<{ offset: string; color: string; opacity?: number }>) {
  return tag(
    "linearGradient",
    { id, x1: "0%", y1: "0%", x2: "100%", y2: "100%" },
    stops.map((stop) => tag("stop", { offset: stop.offset, "stop-color": stop.color, "stop-opacity": stop.opacity ?? 1 })).join("")
  );
}

export function baseDefs(theme: VisualTheme): string {
  const glow = theme.glow
    ? linearGradient("vizforgeGlow", [
        { offset: "0%", color: theme.palette[0], opacity: 0.36 },
        { offset: "55%", color: theme.palette[1] ?? theme.accent, opacity: 0.18 },
        { offset: "100%", color: theme.background, opacity: 0 }
      ])
    : "";
  const bar = linearGradient("vizforgeBar", [
    { offset: "0%", color: theme.palette[0] },
    { offset: "60%", color: theme.palette[1] ?? theme.accent },
    { offset: "100%", color: theme.palette[2] ?? theme.accent }
  ]);
  return tag("defs", {}, glow + bar);
}
