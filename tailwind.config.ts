import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./lib/**/*.{js,ts,jsx,tsx,mdx}"
  ],
  theme: {
    extend: {
      colors: {
        void: "#050816",
        cyanGlow: "#30f6ff",
        violetGlow: "#a855f7"
      },
      boxShadow: {
        glow: "0 0 38px rgba(48, 246, 255, 0.22)",
        violet: "0 0 46px rgba(168, 85, 247, 0.26)"
      },
      fontFamily: {
        sans: ["Inter", "ui-sans-serif", "system-ui", "sans-serif"]
      }
    }
  },
  plugins: []
};

export default config;
