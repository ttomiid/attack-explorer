/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        ink: {
          950: "#07090c",
          900: "#0c1015",
          850: "#11161d",
          800: "#161d26",
          700: "#212a35",
          600: "#324152",
          500: "#4a5d70",
          400: "#748899",
          300: "#96a7b3",
          200: "#c3ced6",
          100: "#e6ebee",
        },
        signal: {
          amber: "#e8a23d",
          cyan: "#4fd3c4",
          red: "#e0533d",
        },
        tactic: {
          0: "#499ad4",
          1: "#467fd4",
          2: "#4462d4",
          3: "#4145d4",
          4: "#573fd4",
          5: "#713cd4",
          6: "#8c3ad4",
          7: "#a837d5",
          8: "#c535d5",
          9: "#d532c6",
          10: "#d530a8",
          11: "#d52d88",
          12: "#d52b67",
          13: "#d62845",
        },
      },
      fontFamily: {
        mono: ["'JetBrains Mono'", "ui-monospace", "SFMono-Regular", "monospace"],
        sans: ["'Space Grotesk'", "system-ui", "sans-serif"],
        body: ["'IBM Plex Sans'", "system-ui", "sans-serif"],
      },
      boxShadow: {
        panel: "0 0 0 1px rgba(255,255,255,0.06), 0 20px 60px -20px rgba(0,0,0,0.6)",
      },
    },
  },
  plugins: [],
};
