import type { Plugin } from "unified";
import { visit } from "unist-util-visit";
import type { Element } from "hast";
import sizeOf from "image-size";

export const rehypeLazy: Plugin = () => {
  return (tree) => {
    visit(tree, "element", (element: Element) => {
      if (element.tagName === "img") {
        let sizes: { width?: number | undefined; height?: number | undefined } =
          {};
        const src = element.properties.src;
        if (src && typeof src === "string" && src.startsWith("/")) {
          const res = sizeOf("./public" + element.properties.src);
          sizes.width = res.width;
          sizes.height = res.height;
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
