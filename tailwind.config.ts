import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./lib/**/*.{js,ts,jsx,tsx,mdx}"
  ],
  theme: {
    extend: {
      fontFamily: {
        heading: ["'Poppins'", "ui-sans-serif", "system-ui"],
        body: ["'Inter'", "ui-sans-serif", "system-ui"]
      },
      colors: {
        brand: {
          50: "#f2f8ff",
          100: "#dbefff",
          200: "#b9ddff",
          300: "#86c1ff",
          400: "#4d9bff",
          500: "#1c74ff",
          600: "#0f59e6",
          700: "#0c46b4",
          800: "#0c3b8f",
          900: "#0d3474",
          950: "#071e45"
        }
      },
      boxShadow: {
        glow: "0 20px 60px -25px rgba(28, 116, 255, 0.45)"
      }
    }
  },
  plugins: []
};

export default config;
