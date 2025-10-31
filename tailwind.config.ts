import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{ts,tsx,mdx}"],
  theme: {
    extend: {
      fontFamily: {
        display: ['"Red Hat Display"', "system-ui", "sans-serif"],
        sans: ['"Inter"', "system-ui", "sans-serif"],
      },
      colors: {
        brand: {
          50: "#fff5f5",
          100: "#ffe9e9",
          200: "#ffc8c8",
          300: "#ff9d9d",
          400: "#ff6969",
          500: "#ff3d3d",
          600: "#ed1f1f",
          700: "#c41414",
          800: "#9d1717",
          900: "#861a1a",
          950: "#470808",
        },
      },
    },
  },
  plugins: [],
};

export default config;
