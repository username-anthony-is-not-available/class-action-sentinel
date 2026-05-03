import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        bg: {
          primary: "#0a0e1a",
          secondary: "#111827",
          card: "rgba(17, 24, 39, 0.7)",
          "card-hover": "rgba(30, 41, 59, 0.8)",
          glass: "rgba(255, 255, 255, 0.03)",
        },
        accent: {
          indigo: "#818cf8",
          violet: "#a78bfa",
          emerald: "#34d399",
          amber: "#fbbf24",
          rose: "#fb7185",
          sky: "#38bdf8",
        },
        text: {
          primary: "#f1f5f9",
          secondary: "#94a3b8",
          muted: "#64748b",
        },
        border: {
          subtle: "rgba(255, 255, 255, 0.06)",
          glow: "rgba(99, 102, 241, 0.3)",
        },
      },
      backgroundImage: {
        "gradient-hero": "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
        "gradient-card": "linear-gradient(135deg, rgba(99, 102, 241, 0.1), rgba(139, 92, 246, 0.05))",
        "gradient-yes": "linear-gradient(135deg, #059669, #10b981)",
        "gradient-no": "linear-gradient(135deg, #dc2626, #ef4444)",
        "gradient-unsure": "linear-gradient(135deg, #d97706, #f59e0b)",
      },
      borderRadius: {
        sm: "8px",
        md: "12px",
        lg: "16px",
        xl: "24px",
      },
      boxShadow: {
        glow: "0 0 30px rgba(99, 102, 241, 0.15)",
      },
    },
  },
  plugins: [],
};
export default config;
