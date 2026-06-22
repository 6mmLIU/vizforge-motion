import type { ThemeId } from "@/lib/visual/visualSpec";

export type VisualTheme = {
  id: ThemeId;
  name: string;
  background: string;
  surface: string;
  border: string;
  text: string;
  muted: string;
  accent: string;
  palette: string[];
  gridOpacity: number;
  axisOpacity: number;
  barRadius: number;
  glow: boolean;
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
  "aurora-dark": {
    id: "aurora-dark",
    name: "Aurora Dark",
    background: "#050816",
    surface: "#0d1326",
    border: "#223150",
    text: "#f7fbff",
    muted: "#94a8c7",
    accent: "#30f6ff",
    palette: ["#30f6ff", "#a855f7", "#36d399", "#f8d66d", "#ff7ab6", "#7dd3fc"],
    gridOpacity: 0.18,
    axisOpacity: 0.34,
    barRadius: 10,
    glow: true,
    typography: { title: 38, subtitle: 17, label: 13, value: 46 },
    defaultMotionDuration: 1400,
    defaultStagger: 80
  },
  "cyber-neon": {
    id: "cyber-neon",
    name: "Cyber Neon",
    background: "#07090f",
    surface: "#10131f",
    border: "#293448",
    text: "#f4fbff",
    muted: "#9aa7ba",
    accent: "#5cffd6",
    palette: ["#5cffd6", "#ff5bd7", "#ffe66d", "#6ca0ff", "#ff8a5c", "#c3ff4d"],
    gridOpacity: 0.22,
    axisOpacity: 0.35,
    barRadius: 8,
    glow: true,
    typography: { title: 36, subtitle: 16, label: 13, value: 44 },
    defaultMotionDuration: 1200,
    defaultStagger: 70
  },
  "glass-finance": {
    id: "glass-finance",
    name: "Glass Finance",
    background: "#07110f",
    surface: "#0f1b19",
    border: "#24453f",
    text: "#f3fff9",
    muted: "#96b4ab",
    accent: "#58e6a9",
    palette: ["#58e6a9", "#87c7ff", "#f7c873", "#d4f880", "#ff8f87", "#b5a6ff"],
    gridOpacity: 0.18,
    axisOpacity: 0.32,
    barRadius: 9,
    glow: false,
    typography: { title: 34, subtitle: 16, label: 12, value: 44 },
    defaultMotionDuration: 1300,
    defaultStagger: 75
  },
  "editorial-light": {
    id: "editorial-light",
    name: "Social Editorial",
    background: "#f4f6fb",
    surface: "#ffffff",
    border: "#dfe5ef",
    text: "#111827",
    muted: "#667085",
    accent: "#2563eb",
    palette: ["#2563eb", "#14b8a6", "#f97316", "#8b5cf6", "#ec4899", "#22c55e", "#f59e0b", "#64748b"],
    gridOpacity: 1,
    axisOpacity: 1,
    barRadius: 12,
    glow: false,
    typography: { title: 28, subtitle: 15, label: 14, value: 34 },
    defaultMotionDuration: 1200,
    defaultStagger: 60
  },
  "minimal-ink": {
    id: "minimal-ink",
    name: "Minimal Ink",
    background: "#f8fafc",
    surface: "#ffffff",
    border: "#d8dee8",
    text: "#0f172a",
    muted: "#64748b",
    accent: "#111827",
    palette: ["#111827", "#475569", "#0ea5e9", "#14b8a6", "#f59e0b", "#ef4444"],
    gridOpacity: 0.24,
    axisOpacity: 0.32,
    barRadius: 5,
    glow: false,
    typography: { title: 33, subtitle: 15, label: 12, value: 42 },
    defaultMotionDuration: 1000,
    defaultStagger: 55
  },
  "warm-paper": {
    id: "warm-paper",
    name: "Warm Paper",
    background: "#fff6e5",
    surface: "#fffaf1",
    border: "#ead8b9",
    text: "#2f2116",
    muted: "#7b6652",
    accent: "#c8553d",
    palette: ["#c8553d", "#2f7a67", "#e0a536", "#3f6fa8", "#8b5cf6", "#db6f9b"],
    gridOpacity: 0.22,
    axisOpacity: 0.34,
    barRadius: 8,
    glow: false,
    typography: { title: 34, subtitle: 16, label: 12, value: 43 },
    defaultMotionDuration: 1250,
    defaultStagger: 70
  },
  "ocean-gradient": {
    id: "ocean-gradient",
    name: "Ocean Gradient",
    background: "#02121c",
    surface: "#062536",
    border: "#14445c",
    text: "#effcff",
    muted: "#9cc9d8",
    accent: "#38bdf8",
    palette: ["#38bdf8", "#2dd4bf", "#a7f3d0", "#facc15", "#fb7185", "#c084fc"],
    gridOpacity: 0.2,
    axisOpacity: 0.34,
    barRadius: 10,
    glow: true,
    typography: { title: 36, subtitle: 16, label: 13, value: 45 },
    defaultMotionDuration: 1350,
    defaultStagger: 75
  },
  "violet-pulse": {
    id: "violet-pulse",
    name: "Violet Pulse",
    background: "#0b0714",
    surface: "#171026",
    border: "#3d2a60",
    text: "#fbf7ff",
    muted: "#b8a8d6",
    accent: "#c084fc",
    palette: ["#c084fc", "#60a5fa", "#f472b6", "#34d399", "#fbbf24", "#fb7185"],
    gridOpacity: 0.18,
    axisOpacity: 0.33,
    barRadius: 10,
    glow: true,
    typography: { title: 36, subtitle: 16, label: 13, value: 45 },
    defaultMotionDuration: 1450,
    defaultStagger: 85
  }
};

export function getTheme(id: ThemeId) {
  return THEMES[id] ?? THEMES["aurora-dark"];
}
