import type { APIRoute } from "astro";
import { getCollection } from "astro:content";
import { ImageResponse } from "@vercel/og";
import { readFile } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
import { createElement } from "react";
import type { FontWeight } from "satori";
import { decompress } from "wawoff2";

const collectionKeys = ["article", "anygram", "slide"] as const;

type CollectionKey = (typeof collectionKeys)[number];

type StaticProps = {
  title: string;
};

const OG_WIDTH = 1200;
const OG_HEIGHT = 630;
const PADDING = 96;
const TITLE_FONT_SIZE = 72;
const LINE_HEIGHT = 1.25;
const ACCENT_FONT = "Zen Kaku Gothic Antique";
const GOOGLE_FONT_CSS_URL =
  "https://fonts.googleapis.com/css2?family=Zen+Kaku+Gothic+Antique:wght@700&display=swap";
const FALLBACK_FONT_FAMILY = "Noto Sans";
const FALLBACK_FONT_PATH = path.join(
  process.cwd(),
  "node_modules",
  "@vercel",
  "og",
  "dist",
  "noto-sans-v27-latin-regular.ttf",
);

type FontResource = {
  data: ArrayBuffer;
  name: string;
  weight: FontWeight;
};

let cachedAssets: Promise<{
  backgroundDataUrl: string;
  font: FontResource;
}> | null = null;

const toArrayBuffer = (view: Uint8Array): ArrayBuffer => {
  if (
    view.byteOffset === 0 &&
    view.byteLength === view.buffer.byteLength &&
    view.buffer instanceof ArrayBuffer
  ) {
    return view.buffer;
  }

  const arrayBuffer = new ArrayBuffer(view.byteLength);
  new Uint8Array(arrayBuffer).set(view);
  return arrayBuffer;
};

const fetchFontData = async (): Promise<ArrayBuffer> => {
  const requestHeaders = {
    "User-Agent":
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36",
    Accept: "text/css,*/*;q=0.1",
  } satisfies Record<string, string>;

  const cssResponse = await fetch(GOOGLE_FONT_CSS_URL, {
    headers: requestHeaders,
  });

  if (!cssResponse.ok) {
    throw new Error(`Failed to load Google Fonts CSS: ${cssResponse.status}`);
  }

  const cssContent = await cssResponse.text();
  const fontUrlMatch = cssContent.match(
    /src: url\((https:[^)]+)\) format\('woff2'\)/,
  );

  if (!fontUrlMatch) {
    throw new Error("Unable to find font URL in Google Fonts response");
  }

  const fontUrl = fontUrlMatch[1];

  const fontResponse = await fetch(fontUrl, {
    headers: {
      ...requestHeaders,
      Accept: "font/woff2",
    },
  });

  if (!fontResponse.ok) {
    throw new Error(`Failed to load font file: ${fontResponse.status}`);
  }

  const woff2Buffer = Buffer.from(await fontResponse.arrayBuffer());
  const ttfBuffer = (await decompress(woff2Buffer)) as Uint8Array;
  return toArrayBuffer(ttfBuffer);
};

const loadAssets = () => {
  if (!cachedAssets) {
    cachedAssets = (async () => {
      const root = process.cwd();
      const backgroundBuffer = await readFile(
        path.join(root, "public", "assets", "og", "default.webp"),
      );

      let font: FontResource;
      try {
        const data = await fetchFontData();
        font = {
          data,
          name: ACCENT_FONT,
          weight: 700,
        };
      } catch (error) {
        console.warn(
          "Failed to fetch Google Font. Falling back to bundled Noto Sans.",
          error,
        );
        const fallbackBuffer = await readFile(FALLBACK_FONT_PATH);
        font = {
          data: toArrayBuffer(fallbackBuffer),
          name: FALLBACK_FONT_FAMILY,
          weight: 400,
        };
      }

      const pngBuffer = await sharp(backgroundBuffer).png().toBuffer();
      const backgroundDataUrl = `data:image/png;base64,${pngBuffer.toString("base64")}`;

      return { backgroundDataUrl, font };
    })();
  }

  return cachedAssets;
};

export async function getStaticPaths() {
  const paths = [] as Array<{
    params: Record<string, string>;
    props: StaticProps;
  }>;

  for (const key of collectionKeys) {
    const entries = await getCollection(key as CollectionKey);

    for (const entry of entries) {
      paths.push({
        params: { collection: key, slug: entry.id },
        props: { title: entry.data.title },
      });
    }
  }

  return paths;
}

export const GET: APIRoute = async ({ props }) => {
  const { backgroundDataUrl, font } = await loadAssets();
  const title = (props as StaticProps).title;
  const fontFamily = font.name;

  const titleNode = createElement(
    "p",
    {
      style: {
        fontFamily,
        fontSize: `${TITLE_FONT_SIZE}px`,
        fontWeight: 700,
        lineHeight: LINE_HEIGHT,
        margin: 0,
        wordBreak: "break-word",
        whiteSpace: "pre-wrap",
        textShadow: "0 6px 18px rgba(0,0,0,0.6)",
      },
    },
    title,
  );

  const signatureNode = createElement(
    "p",
    {
      style: {
        fontFamily,
        margin: 0,
        fontSize: "28px",
        letterSpacing: "2px",
        color: "rgba(255, 255, 255, 0.82)",
      },
    },
    "37108.dev",
  );

  const overlayNode = createElement(
    "div",
    {
      style: {
        position: "relative",
        zIndex: 1,
        width: "100%",
        padding: `${PADDING}px`,
        display: "flex",
        flexDirection: "column",
        gap: "24px",
        alignItems: "flex-end",
        textAlign: "right",
        maxWidth: "70%",
        marginLeft: "auto",
      },
    },
    titleNode,
    signatureNode,
  );

  const backgroundImageNode = createElement("img", {
    src: backgroundDataUrl,
    alt: "",
    style: {
      position: "absolute",
      inset: 0,
      width: "100%",
      height: "100%",
      objectFit: "cover",
    },
  });

  const root = createElement(
    "div",
    {
      style: {
        position: "relative",
        width: "100%",
        height: "100%",
        display: "flex",
        alignItems: "flex-end",
        justifyContent: "flex-start",
        color: "white",
        overflow: "hidden",
      },
    },
    backgroundImageNode,
    overlayNode,
  );

  const image = new ImageResponse(root, {
    width: OG_WIDTH,
    height: OG_HEIGHT,
    fonts: [
      {
        name: font.name,
        data: font.data,
        weight: font.weight,
        style: "normal",
      },
    ],
  });

  image.headers.set("Cache-Control", "public, max-age=31536000, immutable");

  return image;
};

export const prerender = true;
