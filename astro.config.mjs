import { defineConfig } from "astro/config";
import tailwind from "@astrojs/tailwind";
import partytown from "@astrojs/partytown";
import mdx from "@astrojs/mdx";
import sitemap from "@astrojs/sitemap";
import { rehypeLazy } from "./src/lib/lazy-loading";

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
    tailwind(),
    mdx(),
    sitemap(),
  ],
  markdown: {
    shikiConfig: {
      theme: "dark-plus",
    },
    rehypePlugins: [rehypeLazy],
  },
});
