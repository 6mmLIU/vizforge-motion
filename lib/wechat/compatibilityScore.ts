import type { WeChatCompatibilityIssue } from "@/lib/wechat/validateWechatSvg";

export function compatibilityScore(issues: WeChatCompatibilityIssue[], svgLength: number): number {
  const penalty = issues.reduce((score, issue) => {
    if (issue.level === "error") return score + 35;
    if (issue.level === "warning") return score + 12;
    return score + 3;
  }, 0);

  const sizePenalty = svgLength > 256_000 ? 20 : svgLength > 180_000 ? 8 : 0;
  return Math.max(0, Math.min(100, 100 - penalty - sizePenalty));
}
