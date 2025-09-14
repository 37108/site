import { defineConfig } from "astro/config";
import partytown from "@astrojs/partytown";
import mdx from "@astrojs/mdx";
import sitemap from "@astrojs/sitemap";
import tailwindcss from "@tailwindcss/vite";

// https://astro.build/config
export default defineConfig({
  site: "https://37108.dev",
  output: "static",

  integrations: [
    partytown({
      config: {
        forward: ["dataLayer.push"],
      },
    }),
    mdx(),
    sitemap(),
  ],

  markdown: {
    shikiConfig: {
      theme: "dark-plus",
    },
  },

  vite: {
    plugins: [tailwindcss()],
  },
});
