import type { Plugin } from "unified";
import { visit } from "unist-util-visit";
import type { Element } from "hast";
import sizeOf from "image-size";
import { readFileSync } from "fs";

export const rehypeLazy: Plugin = () => {
  return (tree) => {
    visit(tree, "element", (element: Element) => {
      if (element.tagName === "img") {
        let sizes: { width?: number | undefined; height?: number | undefined } =
          {};
        const src = element.properties.src;
        if (src && typeof src === "string" && src.startsWith("/")) {
          try {
            const buffer = readFileSync("./public" + src);
            const res = sizeOf(buffer);
            sizes.width = res.width;
            sizes.height = res.height;
          } catch {
            // Ignore if file doesn't exist
          }
        }
        element.properties = {
          ...(element.properties || {}),
          loading: "lazy",
          decoding: "async",
          ...sizes,
        };
      }
    });
  };
};
