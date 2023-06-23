import type { Plugin } from "unified";
import { visit } from "unist-util-visit";
import type { Element } from "hast";

export const rehypeLazy: Plugin = () => {
  return (tree) => {
    visit(tree, "element", (element: Element) => {
      if (element.tagName === "img") {
        element.properties = {
          ...(element.properties || {}),
          loading: "lazy",
          decoding: "async",
        };
      }
    });
  };
};
