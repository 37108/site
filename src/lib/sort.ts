import { type CollectionEntry } from "astro:content";

export const sort = (collections: CollectionEntry<"article">[]) =>
  collections.sort((a, b) => b.data.date.getTime() - a.data.date.getTime());
