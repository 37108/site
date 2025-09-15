import path from "path";
import type { Plugin } from "unified";
import { visit } from "unist-util-visit";
import { imageSizeFromFile } from "image-size/fromFile";
import type { Element } from "hast";

export const layLoadPlugin: Plugin = () => {
  return async (tree) => {
    const promises: Promise<void>[] = [];

    visit(tree, "element", (element: Element) => {
      if (element.tagName === "img") {
        const src = element.properties?.src;
        const props = {
          ...(element.properties || {}),
          loading: "lazy",
          decoding: "async",
        };

        if (typeof src === "string") {
          const promise = imageSizeFromFile(
            path.join(process.cwd(), "public", src),
          )
            .then((sizes) => {
              element.properties = {
                ...props,
                width: sizes.width,
                height: sizes.height,
              };
            })
            .catch(() => {
              element.properties = {
                ...props,
                loading: "lazy",
                decoding: "async",
              };
            });
          promises.push(promise);
        }
      }
    });

    await Promise.all(promises);
  };
};
