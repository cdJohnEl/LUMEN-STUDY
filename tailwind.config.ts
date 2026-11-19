import type { Config } from "tailwindcss";
import typography from "@tailwindcss/typography";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#14142B",
        canvas: "#EFEFF2",
        muted: "#6B6B80",
        line: "#E4E4EC",
        amber: { brand: "#F7A93B" },
      },
      fontFamily: {
        sans: ['"Plus Jakarta Sans"', "ui-sans-serif", "system-ui", "sans-serif"],
      },
      borderRadius: { "4xl": "2rem" },
      boxShadow: {
        soft: "0 10px 30px -12px rgba(20,20,43,.18)",
        glow: "0 12px 24px -8px rgba(247,169,59,.55)",
      },
    },
  },
  plugins: [typography],
};
export default config;
