import type { ThemeId } from "@/lib/visual/visualSpec";

export type VisualTheme = {
  id: ThemeId;
  name: string;
  mode: "light" | "dark";
  background: string;
  surface: string;
  header: string;
  border: string;
  divider: string;
  text: string;
  strong: string;
  muted: string;
  soft: string;
  accent: string;
  grid: string;
  axis: string;
  track: string;
  onAccent: string;
  palette: string[];
  barRadius: number;
  typography: {
    title: number;
    subtitle: number;
    label: number;
    value: number;
  };
  defaultMotionDuration: number;
  defaultStagger: number;
};

export const THEMES: Record<ThemeId, VisualTheme> = {
  light: {
    id: "light",
    name: "明亮editorial",
    mode: "light",
    background: "#eef2f9",
    surface: "#ffffff",
    header: "#f7f9fd",
    border: "#e4e9f2",
    divider: "#eef2f8",
    text: "#16203a",
    strong: "#0f1830",
    muted: "#6b7689",
    soft: "#8d97a8",
    accent: "#3b6ef5",
    grid: "#eef1f7",
    axis: "#d8e0ec",
    track: "#eef2f7",
    onAccent: "#ffffff",
    palette: ["#3b6ef5", "#12b3a6", "#f59e0b", "#ef5da8", "#7c5cff", "#22a06b", "#e8603c", "#4d80c0"],
    barRadius: 10,
    typography: { title: 40, subtitle: 17, label: 14, value: 46 },
    defaultMotionDuration: 1300,
    defaultStagger: 70
  },
  dark: {
    id: "dark",
    name: "深邃午夜",
    mode: "dark",
    background: "#0b1020",
    surface: "#141b30",
    header: "#172037",
    border: "#27314d",
    divider: "#27314d",
    text: "#eef3ff",
    strong: "#f7faff",
    muted: "#9aa7c4",
    soft: "#7e8cab",
    accent: "#5b8cff",
    grid: "rgba(255,255,255,0.08)",
    axis: "rgba(255,255,255,0.16)",
    track: "rgba(255,255,255,0.09)",
    onAccent: "#0b1020",
    palette: ["#5b8cff", "#33d6c0", "#ffc24b", "#ff77b0", "#a78bfa", "#46d18a", "#ff8a5c", "#7cc4ff"],
    barRadius: 10,
    typography: { title: 40, subtitle: 17, label: 14, value: 46 },
    defaultMotionDuration: 1350,
    defaultStagger: 75
  },
  warm: {
    id: "warm",
    name: "暖阳纸感",
    mode: "light",
    background: "#f6ecdc",
    surface: "#fffaf2",
    header: "#fbf3e6",
    border: "#ecddc6",
    divider: "#f0e6d4",
    text: "#3a2a1b",
    strong: "#2a1d10",
    muted: "#8a7561",
    soft: "#a8957f",
    accent: "#e0683c",
    grid: "#f0e7d6",
    axis: "#e2d3bd",
    track: "#f1e7d6",
    onAccent: "#ffffff",
    palette: ["#e0683c", "#2f8f7d", "#dba12e", "#3f6fa8", "#9b6cff", "#cf548a", "#5aa06a", "#c87b4a"],
    barRadius: 10,
    typography: { title: 40, subtitle: 17, label: 14, value: 46 },
    defaultMotionDuration: 1300,
    defaultStagger: 72
  },
  mono: {
    id: "mono",
    name: "极简墨色",
    mode: "light",
    background: "#f4f5f7",
    surface: "#ffffff",
    header: "#f8f9fb",
    border: "#e5e7eb",
    divider: "#eef0f3",
    text: "#111827",
    strong: "#0b1220",
    muted: "#6b7280",
    soft: "#9097a3",
    accent: "#2563eb",
    grid: "#eef0f3",
    axis: "#dadde3",
    track: "#eef0f3",
    onAccent: "#ffffff",
    palette: ["#1f2937", "#4b5563", "#6b7280", "#94a3b8", "#2563eb", "#0ea5e9", "#64748b", "#334155"],
    barRadius: 8,
    typography: { title: 40, subtitle: 17, label: 14, value: 46 },
    defaultMotionDuration: 1100,
    defaultStagger: 60
  }
};

const THEME_ALIASES: Record<string, ThemeId> = {
  "editorial-light": "light",
  "minimal-ink": "mono",
  "warm-paper": "warm",
  "aurora-dark": "dark",
  "cyber-neon": "dark",
  "glass-finance": "dark",
  "ocean-gradient": "dark",
  "violet-pulse": "dark"
};

export function resolveThemeId(id: string | undefined): ThemeId {
  if (!id) return "light";
  if (id in THEMES) return id as ThemeId;
  return THEME_ALIASES[id] ?? "light";
}

export function getTheme(id: string): VisualTheme {
  return THEMES[resolveThemeId(id)];
}
