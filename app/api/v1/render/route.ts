import { renderAnimatedSvg } from "@/lib/motion/animatedSvgRenderer";
import { svgToImage, type ImageExportFormat } from "@/lib/render/svgToImage";
import { resolveVisualItemCount } from "@/lib/visual/autoPalette";
import { recommendVisual } from "@/lib/visual/recommendVisual";
import { resolveThemeId } from "@/lib/visual/themes";
import { DEFAULT_VISUAL_SPEC, VisualSpecSchema, defaultMotionForType, type ExportFormat, type VisualSpec } from "@/lib/visual/visualSpec";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

export const runtime = "nodejs";

const MAX_BODY_BYTES = 512 * 1024;
const IMAGE_FORMATS = new Set<ExportFormat>(["png", "webp", "jpeg"]);
const RENDER_ITEM_LIMITS: Partial<Record<VisualSpec["type"], number>> = {
  heatmap: 400
};

const TYPE_ALIASES: Record<string, VisualSpec["type"]> = {
  "grouped-bar": "bar",
  waterfall: "bar",
  radar: "bar",
  ranking: "horizontal-bar",
  "bar-race": "horizontal-bar",
  arc: "donut",
  gauge: "donut",
  slope: "line",
  bump: "line",
  timeline: "line",
  "line-race": "line",
  sankey: "treemap",
  network: "treemap"
};

const STORY_ALIASES: Record<string, VisualSpec["story"]> = {
  flow: "part-to-whole",
  spatial: "distribution",
  deviation: "magnitude"
};

function resolveType(type: string): VisualSpec["type"] {
  return TYPE_ALIASES[type] ?? (type as VisualSpec["type"]);
}

function resolveStory(story: string): VisualSpec["story"] {
  return STORY_ALIASES[story] ?? (story as VisualSpec["story"]);
}

function safeError(message: string, status: number) {
  return NextResponse.json({ error: message }, { status });
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function stringValue(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value : undefined;
}

function imageFormatFromAccept(accept: string): ImageExportFormat | null {
  if (accept.includes("image/webp")) return "webp";
  if (accept.includes("image/jpeg") || accept.includes("image/jpg")) return "jpeg";
  if (accept.includes("image/png")) return "png";
  return null;
}

function imageFormatFromExport(format: ExportFormat): ImageExportFormat | null {
  return IMAGE_FORMATS.has(format) ? (format as ImageExportFormat) : null;
}

function normalizeRenderPayload(input: unknown): unknown {
  if (!isRecord(input) || (!isRecord(input.visual) && !Array.isArray(input.data))) {
    return input;
  }

  const visual = isRecord(input.visual) ? input.visual : {};
  const motion = isRecord(input.motion) ? input.motion : {};
  const exportConfig = isRecord(input.export) ? input.export : {};
  const dataRows = Array.isArray(input.data)
    ? input.data
    : isRecord(input.data) && Array.isArray(input.data.rows)
      ? input.data.rows
      : DEFAULT_VISUAL_SPEC.data.rows;
  const type = resolveType(stringValue(visual.type) ?? stringValue(input.type) ?? DEFAULT_VISUAL_SPEC.type);
  const story = resolveStory(stringValue(visual.story) ?? stringValue(input.story) ?? DEFAULT_VISUAL_SPEC.story);
  const exportFormat = stringValue(exportConfig.format) ?? DEFAULT_VISUAL_SPEC.export.format;
  const target = stringValue(exportConfig.target)?.toLowerCase();
  const targetSize =
    target === "xiaohongshu" || target === "rednote" || target === "social"
      ? { width: 1080, height: 1440 }
      : target === "highres" || target === "poster"
        ? { width: 1440, height: 1000 }
        : {};
  const mappings = isRecord(input.mappings)
    ? input.mappings
    : isRecord(visual.mappings)
      ? visual.mappings
      : recommendVisual(dataRows.filter(isRecord) as VisualSpec["data"]["rows"], { type: type as VisualSpec["type"], story: story as VisualSpec["story"] }).mappings;

  return {
    ...DEFAULT_VISUAL_SPEC,
    title: stringValue(input.title) ?? stringValue(visual.title) ?? DEFAULT_VISUAL_SPEC.title,
    subtitle: stringValue(input.subtitle) ?? stringValue(visual.subtitle),
    insight: stringValue(input.insight) ?? stringValue(visual.insight),
    caption: stringValue(input.caption) ?? stringValue(visual.caption),
    source: stringValue(input.source) ?? stringValue(visual.source),
    card: isRecord(input.card) ? input.card : isRecord(visual.card) ? visual.card : undefined,
    palette: Array.isArray(input.palette) ? input.palette : Array.isArray(visual.palette) ? visual.palette : undefined,
    type,
    story,
    theme: resolveThemeId(stringValue(input.theme) ?? stringValue(visual.theme) ?? DEFAULT_VISUAL_SPEC.theme),
    data: { rows: dataRows },
    mappings,
    motion: {
      ...defaultMotionForType(type as VisualSpec["type"]),
      ...motion,
      preset: stringValue(motion.preset) ?? defaultMotionForType(type as VisualSpec["type"]).preset
    },
    export: {
      ...DEFAULT_VISUAL_SPEC.export,
      ...targetSize,
      ...exportConfig,
      format: exportFormat,
      wechatSafeMode:
        typeof exportConfig.wechatSafeMode === "boolean"
          ? exportConfig.wechatSafeMode
          : stringValue(exportConfig.target) === "wechat"
            ? true
            : DEFAULT_VISUAL_SPEC.export.wechatSafeMode
    }
  };
}

export async function POST(request: NextRequest) {
  const contentLength = Number(request.headers.get("content-length") ?? "0");
  if (contentLength > MAX_BODY_BYTES) {
    return safeError("请求体过大。请把请求控制在 512KB 内。", 413);
  }

  let json: unknown;
  try {
    json = await request.json();
  } catch {
    return safeError("请求体必须是合法 JSON。", 400);
  }

  const normalized = normalizeRenderPayload(json);
  const parsed = VisualSpecSchema.safeParse(normalized);
  if (!parsed.success) {
    return NextResponse.json(
      {
        error: "VisualSpec 请求无效。",
        issues: parsed.error.issues.map((issue) => ({
          path: issue.path.join("."),
          message: issue.message
        }))
      },
      { status: 400 }
    );
  }

  try {
    const spec = parsed.data;
    const result = renderAnimatedSvg(spec);
    const dataItemCount = resolveVisualItemCount(spec);
    const renderedItemCount = Math.min(dataItemCount, RENDER_ITEM_LIMITS[spec.type] ?? 200);
    const meta = {
      visual: {
        type: spec.type,
        story: spec.story
      },
      mappings: spec.mappings ?? {},
      rowCount: spec.data.rows.length,
      dataItemCount,
      itemCount: dataItemCount,
      renderedItemCount,
      export: {
        format: spec.export.format,
        width: spec.export.width,
        height: spec.export.height,
        pixelRatio: spec.export.pixelRatio,
        wechatSafeMode: spec.export.wechatSafeMode
      }
    };
    const accept = request.headers.get("accept") ?? "";
    const acceptImageFormat = imageFormatFromAccept(accept);
    const exportImageFormat = imageFormatFromExport(spec.export.format);

    if (accept.includes("image/svg+xml")) {
      return new NextResponse(result.svg, {
        headers: {
          "content-type": "image/svg+xml; charset=utf-8",
          "cache-control": "no-store",
          "content-disposition": "inline; filename=\"vizforge-motion.svg\""
        }
      });
    }

    if (acceptImageFormat) {
      const image = await svgToImage(result.svg, acceptImageFormat, { pixelRatio: spec.export.pixelRatio });
      return new NextResponse(image.buffer, {
        headers: {
          "content-type": image.contentType,
          "cache-control": "no-store",
          "content-disposition": `inline; filename="vizforge-motion.${image.extension}"`
        }
      });
    }

    if (spec.export.format === "static-svg") {
      return NextResponse.json(
        {
          error: "static-svg 暂未实现，因为需要为每个图形生成最终静态状态。",
          supportedFormats: ["animated-svg", "png", "webp", "jpeg", "json"],
          requestedFormat: spec.export.format
        },
        { status: 501 }
      );
    }

    const jsonImageFormat = exportImageFormat ?? "png";
    const image = await svgToImage(result.svg, jsonImageFormat, { pixelRatio: spec.export.pixelRatio });
    const imageBase64 = image.buffer.toString("base64");

    return NextResponse.json(
      {
        assets: {
          svg: result.svg,
          svgContentType: "image/svg+xml; charset=utf-8",
          imageBase64,
          imageDataUrl: `data:${image.contentType};base64,${imageBase64}`,
          imageContentType: image.contentType,
          imageFormat: image.extension,
          palette: result.palette,
          width: image.width,
          height: image.height,
          pixelRatio: image.pixelRatio,
          layoutWidth: spec.export.width,
          layoutHeight: spec.export.height
        },
        svg: result.svg,
        palette: result.palette,
        meta,
        warnings: result.warnings,
        compatibility: result.compatibility
      },
      { headers: { "cache-control": "no-store" } }
    );
  } catch (error) {
    if (error instanceof z.ZodError) {
      return safeError("渲染输入无效。", 400);
    }
    return safeError(error instanceof Error ? error.message : "渲染失败。", 500);
  }
}
