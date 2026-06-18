import { easingAttrs } from "@/lib/motion/easing";
import { seconds } from "@/lib/motion/timeline";
import type { MotionSpec } from "@/lib/visual/visualSpec";

export type SvgAttrs = Record<string, string | number | boolean | null | undefined>;

export function escapeXml(value: unknown): string {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

export function attrs(attributes: SvgAttrs = {}): string {
  return Object.entries(attributes)
    .filter(([, value]) => value !== undefined && value !== null && value !== false)
    .map(([key, value]) => `${key}="${escapeXml(value === true ? key : value)}"`)
    .join(" ");
}

export function tag(name: string, attributes: SvgAttrs = {}, children = ""): string {
  const attrText = attrs(attributes);
  const open = attrText ? `<${name} ${attrText}` : `<${name}`;
  return children ? `${open}>${children}</${name}>` : `${open}/>`;
}

export function svgRoot(options: { width: number; height: number; children: string; background?: string }): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${options.width}" height="${options.height}" viewBox="0 0 ${options.width} ${options.height}" role="img">${options.background ? `<rect x="0" y="0" width="${options.width}" height="${options.height}" fill="${escapeXml(options.background)}"/>` : ""}${options.children}</svg>`;
}

export function group(children: string, attributes: SvgAttrs = {}): string {
  return tag("g", attributes, children);
}

export function rect(attributes: SvgAttrs, animations = ""): string {
  return tag("rect", attributes, animations);
}

export function circle(attributes: SvgAttrs, animations = ""): string {
  return tag("circle", attributes, animations);
}

export function path(attributes: SvgAttrs, animations = ""): string {
  return tag("path", attributes, animations);
}

export function line(attributes: SvgAttrs, animations = ""): string {
  return tag("line", attributes, animations);
}

export function polygon(attributes: SvgAttrs, animations = ""): string {
  return tag("polygon", attributes, animations);
}

export function textNode(content: unknown, attributes: SvgAttrs, animations = ""): string {
  return tag("text", attributes, `${escapeXml(content)}${animations}`);
}

export function animate(
  attributeName: string,
  from: string | number,
  to: string | number,
  durationMs: number,
  delayMs: number,
  options: Partial<MotionSpec> & { fill?: "freeze" | "remove"; repeatCount?: string } = {}
): string {
  return tag("animate", {
    attributeName,
    from,
    to,
    dur: seconds(durationMs),
    begin: seconds(delayMs),
    fill: options.fill ?? "freeze",
    repeatCount: options.repeatCount,
    ...easingAttrs(options.easing ?? "cinematic")
  });
}

export function animateTransform(
  type: "translate" | "scale" | "rotate" | "skewX" | "skewY",
  from: string | number,
  to: string | number,
  durationMs: number,
  delayMs: number,
  options: Partial<MotionSpec> & { fill?: "freeze" | "remove"; additive?: string } = {}
): string {
  return tag("animateTransform", {
    attributeName: "transform",
    type,
    from,
    to,
    dur: seconds(durationMs),
    begin: seconds(delayMs),
    fill: options.fill ?? "freeze",
    additive: options.additive,
    ...easingAttrs(options.easing ?? "cinematic")
  });
}

export function smilAnimateNumber(params: {
  attributeName: string;
  from: number;
  to: number;
  durationMs: number;
  delayMs: number;
  easing: MotionSpec["easing"];
  fill?: "freeze" | "remove";
}) {
  return animate(
    params.attributeName,
    Number(params.from.toFixed(3)),
    Number(params.to.toFixed(3)),
    params.durationMs,
    params.delayMs,
    { easing: params.easing, fill: params.fill ?? "freeze" }
  );
}
