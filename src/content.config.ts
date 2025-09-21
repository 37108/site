import { defineCollection, z } from "astro:content";
import { glob } from "astro/loaders";

const article = defineCollection({
  loader: glob({
    pattern: "**/[^_]*.{md,mdx}",
    base: "./src/contents/articles",
  }),
  schema: z.object({
    title: z.string(),
    description: z.string(),
    date: z.date(),
    image: z.string(),
    tags: z.array(z.string()).optional(),
  }),
});

const anygram = defineCollection({
  loader: glob({
    pattern: "**/[^_]*.{md,mdx}",
    base: "./src/contents/anygrams",
  }),
  schema: z.object({
    title: z.string(),
  }),
});

const slide = defineCollection({
  loader: glob({
    pattern: "**/[^_]*.{md,mdx}",
    base: "./src/contents/slides",
  }),
  schema: z.object({
    title: z.string(),
    date: z.date(),
  }),
});

export const collections = {
  article,
  anygram,
  slide,
};
