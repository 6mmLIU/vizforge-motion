export const WECHAT_SAFE_ELEMENTS = new Set([
  "svg",
  "g",
  "defs",
  "linearGradient",
  "radialGradient",
  "stop",
  "rect",
  "circle",
  "ellipse",
  "line",
  "polyline",
  "polygon",
  "path",
  "text",
  "tspan",
  "animate",
  "animateTransform",
  "set"
]);

export const WECHAT_SAFE_ANIMATE_ATTRIBUTES = new Set([
  "x",
  "y",
  "width",
  "height",
  "opacity",
  "d",
  "points",
  "stroke-width",
  "stroke-linecap",
  "stroke-dashoffset",
  "fill",
  "visibility",
  "transform"
]);

export const WECHAT_SAFE_TRANSFORMS = new Set(["translate", "scale", "rotate", "skewX", "skewY"]);

export const UNSAFE_ELEMENTS = new Set(["script", "foreignObject", "iframe", "image", "video", "audio", "canvas"]);
