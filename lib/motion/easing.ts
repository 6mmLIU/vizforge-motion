import type { MotionSpec } from "@/lib/visual/visualSpec";

export function easingAttrs(easing: MotionSpec["easing"]): Record<string, string> {
  if (easing === "linear") return { calcMode: "linear" };
  const splines: Record<Exclude<MotionSpec["easing"], "linear">, string> = {
    "ease-out": "0.16 1 0.3 1",
    "ease-in-out": "0.65 0 0.35 1",
    cinematic: "0.22 1 0.36 1"
  };
  return {
    calcMode: "spline",
    keyTimes: "0;1",
    keySplines: splines[easing]
  };
}
