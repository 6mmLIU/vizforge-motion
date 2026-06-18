import { minifySvg } from "@/lib/wechat/minifySvg";
import { validateWechatSvg } from "@/lib/wechat/validateWechatSvg";

export function toWechatSafeSvg(svg: string) {
  const minified = minifySvg(svg);
  return {
    svg: minified,
    compatibility: validateWechatSvg(minified)
  };
}
