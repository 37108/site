import { defineCollection, z } from "astro:content";

const article = defineCollection({
  schema: z.object({
    title: z.string(),
    description: z.string(),
    date: z.date(),
    image: z.string(),
    tags: z.array(z.string()).optional(),
  }),
});

export const collections = { article };
