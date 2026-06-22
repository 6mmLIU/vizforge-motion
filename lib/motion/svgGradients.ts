import { tag } from "@/lib/motion/svgPrimitives";
import { GRADIENT_CAP, darken, lighten } from "@/lib/motion/layout";
import type { VisualTheme } from "@/lib/visual/themes";

export function linearGradient(
  id: string,
  stops: Array<{ offset: string; color: string; opacity?: number }>,
  vertical = false
) {
  const coords = vertical ? { x1: "0%", y1: "0%", x2: "0%", y2: "100%" } : { x1: "0%", y1: "0%", x2: "100%", y2: "100%" };
  return tag(
    "linearGradient",
    { id, ...coords },
    stops.map((stop) => tag("stop", { offset: stop.offset, "stop-color": stop.color, "stop-opacity": stop.opacity ?? 1 })).join("")
  );
}

export function baseDefs(theme: VisualTheme): string {
  const count = Math.min(theme.palette.length, GRADIENT_CAP);
  const gradients = Array.from({ length: count }, (_, index) => {
    const color = theme.palette[index];
    const top = theme.mode === "dark" ? lighten(color, 0.22) : lighten(color, 0.16);
    const bottom = theme.mode === "dark" ? darken(color, 0.06) : darken(color, 0.04);
    return linearGradient(`vizGrad${index}`, [
      { offset: "0%", color: top },
      { offset: "100%", color: bottom }
    ], true);
  }).join("");

  return tag("defs", {}, gradients);
}
