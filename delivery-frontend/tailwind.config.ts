import { heroui } from "@heroui/react";

/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
    "./node_modules/@heroui/theme/dist/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ["Inter", "sans-serif"],
        display: ["Outfit", "sans-serif"],
      },
    },
  },
  darkMode: "class",
  plugins: [
    heroui({
      addCommonColors: true,
      themes: {
        light: {
          colors: {
            background: "#FFFFFF",
            foreground: "#11181C",
            primary: {
              DEFAULT: "#FF8A00",
              foreground: "#FFFFFF",
            },
            focus: "#FF8A00",
          },
        },
        dark: {
          colors: {
            background: "#050505",
            foreground: "#ECEDEE",
            primary: {
              DEFAULT: "#FF8A00",
              foreground: "#FFFFFF",
            },
            focus: "#FF8A00",
            content1: "#0A0A0A",
            content2: "#141414",
            content3: "#1C1C1C",
            content4: "#262626",
          },
        },
      },
    }),
  ],
};
