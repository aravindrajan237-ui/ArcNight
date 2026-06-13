import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // HarvestLink brand: earthy green + harvest amber
        harvest: {
          50: "#f3f9ec",
          100: "#e3f0d2",
          500: "#4d7c2a",
          600: "#3d6321",
          700: "#2f4d19",
        },
        amber: {
          DEFAULT: "#f59e0b",
        },
      },
    },
  },
  plugins: [],
};

export default config;
