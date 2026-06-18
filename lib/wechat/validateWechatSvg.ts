import {
  UNSAFE_ELEMENTS,
  WECHAT_SAFE_ANIMATE_ATTRIBUTES,
  WECHAT_SAFE_ELEMENTS,
  WECHAT_SAFE_TRANSFORMS
} from "@/lib/wechat/wechatSvgWhitelist";
import { compatibilityScore } from "@/lib/wechat/compatibilityScore";

export type WeChatCompatibilityIssue = {
  level: "error" | "warning" | "info";
  code: string;
  message: string;
};

export type WeChatCompatibilityResult = {
  safe: boolean;
  score: number;
  issues: WeChatCompatibilityIssue[];
};

function addIssue(
  issues: WeChatCompatibilityIssue[],
  level: WeChatCompatibilityIssue["level"],
  code: string,
  message: string
) {
  issues.push({ level, code, message });
}

export function validateWechatSvg(svg: string): WeChatCompatibilityResult {
  const issues: WeChatCompatibilityIssue[] = [];
  const normalized = svg.replace(/\s+/g, " ");

  if (!/<svg[\s>]/i.test(svg)) addIssue(issues, "error", "ERROR_MISSING_SVG", "SVG root element is missing.");
  if (!/\sxmlns=["']http:\/\/www\.w3\.org\/2000\/svg["']/i.test(svg)) {
    addIssue(issues, "error", "ERROR_MISSING_XMLNS", "SVG xmlns is required.");
  }
  if (!/\sviewBox=["'][^"']+["']/i.test(svg)) {
    addIssue(issues, "error", "ERROR_MISSING_VIEWBOX", "SVG viewBox is required.");
  }

  for (const element of UNSAFE_ELEMENTS) {
    if (new RegExp(`<\\s*${element}\\b`, "i").test(svg)) {
      addIssue(issues, "error", `ERROR_${element.toUpperCase()}_TAG`, `${element} is not allowed in WeChat safe SVG.`);
    }
  }

  if (/<\s*style\b/i.test(svg)) addIssue(issues, "warning", "WARNING_STYLE_BLOCK", "Style blocks can be stripped by WeChat.");
  if (/\son[a-z]+\s*=/i.test(svg)) addIssue(issues, "error", "ERROR_EVENT_HANDLER", "Event handler attributes are not allowed.");
  if (/\s(?:href|xlink:href)\s*=\s*["'](?:https?:)?\/\//i.test(svg)) {
    addIssue(issues, "warning", "WARNING_EXTERNAL_URL", "External URLs are not safe in WeChat SVG.");
  }
  if (/\s(?:href|xlink:href)\s*=\s*["']data:image\/[^"']*base64/i.test(svg)) {
    addIssue(issues, "error", "ERROR_BASE64_IMAGE", "Base64 images are not allowed in WeChat safe mode.");
  }
  if (/url\(\s*['"]?(?:https?:)?\/\//i.test(svg)) {
    addIssue(issues, "warning", "WARNING_EXTERNAL_URL", "External paint servers are not safe in WeChat SVG.");
  }
  if (svg.length > 256_000) {
    addIssue(issues, "warning", "WARNING_SVG_TOO_LARGE", "SVG is larger than 256KB; use fewer points or export GIF/PNG.");
  }

  const tagMatches = normalized.matchAll(/<\s*\/?\s*([a-zA-Z][\w:-]*)\b/g);
  for (const match of tagMatches) {
    const tag = match[1];
    if (!tag.startsWith("/") && !WECHAT_SAFE_ELEMENTS.has(tag) && tag !== "xml") {
      addIssue(issues, "warning", "WARNING_UNSUPPORTED_ELEMENT", `${tag} may not be supported in WeChat safe SVG.`);
    }
  }

  const animateMatches = svg.matchAll(/<\s*animate\b[^>]*attributeName=["']([^"']+)["'][^>]*>/gi);
  for (const match of animateMatches) {
    const attributeName = match[1];
    if (!WECHAT_SAFE_ANIMATE_ATTRIBUTES.has(attributeName)) {
      addIssue(
        issues,
        "error",
        "ERROR_UNSUPPORTED_ANIMATE_ATTRIBUTE",
        `animate attributeName="${attributeName}" is not allowed in WeChat safe mode.`
      );
    }
  }

  const transformMatches = svg.matchAll(/<\s*animateTransform\b[^>]*type=["']([^"']+)["'][^>]*>/gi);
  for (const match of transformMatches) {
    const type = match[1];
    if (!WECHAT_SAFE_TRANSFORMS.has(type)) {
      addIssue(issues, "error", "ERROR_UNSUPPORTED_TRANSFORM", `animateTransform type="${type}" is not allowed.`);
    }
  }

  const score = compatibilityScore(issues, svg.length);
  return {
    safe: !issues.some((issue) => issue.level === "error"),
    score,
    issues
  };
}
