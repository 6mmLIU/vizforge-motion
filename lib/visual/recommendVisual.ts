import { inferSchema } from "@/lib/data/inferSchema";
import type { DataRow, FieldMapping, VisualStory, VisualType } from "@/lib/visual/visualSpec";

export type VisualRecommendation = {
  type: VisualType;
  story: VisualStory;
  mappings: FieldMapping;
  confidence: number;
  reason: string;
};

export function recommendVisual(rows: DataRow[], requested?: Partial<{ type: VisualType; story: VisualStory }>): VisualRecommendation {
  const columns = inferSchema(rows);
  const numberColumns = columns.filter((column) => column.type === "number");
  const dateColumns = columns.filter((column) => column.type === "date");
  const categoryColumns = columns.filter((column) => column.type === "category" || column.type === "string");
  const names = new Set(columns.map((column) => column.name.toLowerCase()));

  const categoryColumn = categoryColumns[0];
  const dateColumn = dateColumns[0];
  const category = categoryColumn?.name;
  const value = numberColumns[0]?.name;
  const secondNumber = numberColumns[1]?.name;
  const date = dateColumn?.name;
  const dateLooksLikeRowAxis = Boolean(date && categoryColumn && dateColumn && dateColumn.uniqueCount >= rows.length * 0.8 && categoryColumn.uniqueCount < rows.length);
  const magnitudeCategory = dateLooksLikeRowAxis ? date : category ?? date;

  if (requested?.type && value) {
    if ((requested.type === "sankey" || requested.type === "network") && names.has("source") && names.has("target")) {
      return {
        type: requested.type,
        story: "flow",
        mappings: { source: "source", target: "target", value },
        confidence: 0.86,
        reason: "已按你选择的流向图映射 source、target 和 value。"
      };
    }

    if ((requested.type === "scatter" || requested.type === "bubble") && secondNumber) {
      return {
        type: requested.type,
        story: requested.story ?? "correlation",
        mappings: { x: value, y: secondNumber, value, category },
        confidence: 0.86,
        reason: "已按你选择的关系图映射两个数值字段。"
      };
    }

    const partToWholeTypes: VisualType[] = ["donut", "pie", "arc", "rose", "gauge"];
    const timeTypes: VisualType[] = ["line", "area", "timeline", "slope", "bump", "line-race"];
    const categoryForRequested = partToWholeTypes.includes(requested.type)
      ? category ?? columns.find((column) => column.name !== value && column.name !== date)?.name ?? date ?? value
      : timeTypes.includes(requested.type)
        ? date ?? category ?? columns.find((column) => column.name !== value)?.name ?? value
        : requested.type === "metric-card"
          ? date ?? category ?? columns.find((column) => column.name !== value)?.name ?? value
        : magnitudeCategory ?? columns.find((column) => column.name !== value)?.name ?? value;
    const seriesForRequested = timeTypes.includes(requested.type) && category && category !== categoryForRequested ? category : undefined;
    const storyForRequested: VisualStory =
      requested.story ??
      (partToWholeTypes.includes(requested.type)
        ? "part-to-whole"
        : timeTypes.includes(requested.type)
          ? "change-over-time"
          : "magnitude");

    return {
      type: requested.type,
      story: storyForRequested,
      mappings: {
        x: categoryForRequested,
        y: value,
        category: categoryForRequested,
        value,
        ...(seriesForRequested ? { series: seriesForRequested } : {})
      },
      confidence: 0.86,
      reason: partToWholeTypes.includes(requested.type)
        ? "已按构成类图表优先映射分类字段和数值字段。"
        : timeTypes.includes(requested.type)
          ? "已按趋势类图表优先映射时间字段和数值字段。"
          : "已按你选择的图表类型映射分类字段和数值字段。"
    };
  }

  if (requested?.type === "rose" && category && value) {
    return {
      type: "rose",
      story: requested.story ?? "part-to-whole",
      mappings: { category, value },
      confidence: 0.86,
      reason: "已按玫瑰图映射分类字段和数值字段。"
    };
  }

  if (names.has("source") && names.has("target") && (names.has("value") || value)) {
    return {
      type: "sankey",
      story: "flow",
      mappings: { source: "source", target: "target", value: names.has("value") ? "value" : value },
      confidence: 0.78,
      reason: "检测到 source、target 和 value，适合流向图。"
    };
  }

  if (date && value) {
    return {
      type: "line",
      story: "change-over-time",
      mappings: { x: date, y: value, value, category: date, ...(category ? { series: category } : {}) },
      confidence: 0.9,
      reason: "检测到日期字段和数值字段，适合趋势图。"
    };
  }

  if (numberColumns.length >= 2) {
    return {
      type: "scatter",
      story: "correlation",
      mappings: { x: numberColumns[0].name, y: secondNumber },
      confidence: 0.8,
      reason: "检测到两个数值字段，适合关系或相关性视图。"
    };
  }

  if (columns.length === 1 && value) {
    return {
      type: "metric-card",
      story: "single-metric",
      mappings: { value },
      confidence: 0.72,
      reason: "只有一个数值字段，适合指标卡。"
    };
  }

  if (category && value) {
    const uniqueCount = categoryColumns[0]?.uniqueCount ?? rows.length;
    if ((requested?.story === "part-to-whole" || uniqueCount <= 12) && rows.every((row) => Number(row[value]) >= 0)) {
      return {
        type: requested?.story === "part-to-whole" ? "donut" : uniqueCount > 8 ? "horizontal-bar" : "bar",
        story: requested?.story ?? "magnitude",
        mappings: { category, value },
        confidence: 0.84,
        reason: "分类字段加数值字段，适合对比、排行或占比图。"
      };
    }

    return {
      type: uniqueCount > 8 ? "horizontal-bar" : "bar",
      story: uniqueCount > 8 ? "ranking" : "magnitude",
      mappings: { category, value },
      confidence: 0.88,
      reason: "分类字段加数值字段，适合柱状或条形动画。"
    };
  }

  return {
    type: "metric-card",
    story: "single-metric",
    mappings: { value: value ?? columns[0]?.name },
    confidence: 0.44,
    reason: "没有检测到稳定图表结构，先回退到紧凑指标卡。"
  };
}
