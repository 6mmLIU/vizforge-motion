"use client";

import { getTheme } from "@/lib/visual/themes";
import type { VisualSpec } from "@/lib/visual/visualSpec";
import * as echarts from "echarts";
import { useEffect, useMemo, useRef } from "react";

function optionForSpec(spec: VisualSpec): echarts.EChartsOption {
  const baseTheme = getTheme(spec.theme);
  const theme = spec.palette?.length ? { ...baseTheme, palette: spec.palette, accent: spec.palette[0] } : baseTheme;
  const rows = spec.data.rows;
  const categoryField = spec.mappings?.category ?? spec.mappings?.x ?? Object.keys(rows[0] ?? {})[0];
  const valueField = spec.mappings?.value ?? spec.mappings?.y ?? Object.keys(rows[0] ?? {})[1] ?? categoryField;
  const categories = rows.map((row, index) => String(row[categoryField] ?? `Item ${index + 1}`));
  const values = rows.map((row) => Number(row[valueField] ?? 0));

  const base = {
    backgroundColor: "transparent",
    color: theme.palette,
    grid: { left: 46, right: 24, top: 26, bottom: 38 },
    textStyle: {
      color: theme.muted,
      fontFamily: "Inter, Arial, sans-serif"
    },
    tooltip: { trigger: "axis" }
  } satisfies echarts.EChartsOption;

  if (["line", "area", "timeline", "slope", "bump"].includes(spec.type)) {
    return {
      ...base,
      xAxis: { type: "category", data: categories, axisLine: { lineStyle: { color: theme.border } }, axisLabel: { color: theme.muted } },
      yAxis: { type: "value", splitLine: { lineStyle: { color: theme.border, opacity: theme.gridOpacity } }, axisLabel: { color: theme.muted } },
      series: [{ type: "line", smooth: true, areaStyle: spec.type === "area" ? { opacity: 0.18 } : undefined, data: values }]
    };
  }

  if (["donut", "pie", "arc", "rose"].includes(spec.type)) {
    return {
      ...base,
      series: [
        {
          type: "pie",
          radius: spec.type === "donut" ? ["48%", "70%"] : spec.type === "rose" ? ["18%", "70%"] : "66%",
          roseType: spec.type === "rose" ? "radius" : undefined,
          data: categories.map((name, index) => ({ name, value: values[index] })),
          label: { color: theme.muted }
        }
      ]
    };
  }

  return {
    ...base,
    xAxis: spec.type === "horizontal-bar" ? { type: "value", axisLabel: { color: theme.muted } } : { type: "category", data: categories, axisLabel: { color: theme.muted } },
    yAxis: spec.type === "horizontal-bar" ? { type: "category", data: categories, axisLabel: { color: theme.muted } } : { type: "value", axisLabel: { color: theme.muted } },
    series: [
      {
        type: "bar",
        data: values,
        barWidth: "48%",
        itemStyle: { borderRadius: theme.barRadius }
      }
    ]
  };
}

export function StaticEChartPreview({ spec }: { spec: VisualSpec }) {
  const ref = useRef<HTMLDivElement | null>(null);
  const option = useMemo(() => optionForSpec(spec), [spec]);

  useEffect(() => {
    if (!ref.current) return;
    const chart = echarts.init(ref.current, undefined, { renderer: "svg" });
    chart.setOption(option, true);
    const resize = () => chart.resize();
    window.addEventListener("resize", resize);
    return () => {
      window.removeEventListener("resize", resize);
      chart.dispose();
    };
  }, [option]);

  return <div ref={ref} className="h-full min-h-[260px] w-full" aria-label="Static ECharts preview" />;
}
