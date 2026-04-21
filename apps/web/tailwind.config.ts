import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#0f172a",
        paper: "#f7f7f5",
        accent: "#146356",
        warn: "#a16207"
      }
    }
  },
  plugins: []
};

export default config;
