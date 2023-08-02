/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  content: ["./src/**/*.{astro,html,js,jsx,md,mdx,svelte,ts,tsx,vue}"],
  theme: {
    fontFamily: {
      "rale-way": ["Raleway", "sans-serif"],
      "noto-sans": ["Noto Sans JP", "sans-serif"],
      "jetbrains": ['JetBrains Mono', 'monospace']
    },
    extend: {
      spacing: [...Array(100 - 3)]
        .map((_, i) => i + 4)
        .reduce(
          (acc, cur) => ({
            ...acc,
            [cur]: String(cur * 0.25) + "rem",
          }),
          {}
        ),
    },
  },
};
