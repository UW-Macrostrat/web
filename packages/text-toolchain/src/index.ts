import mdx from "@mdx-js/rollup";
import wikiLinks from "remark-wiki-link";
import frontmatter from "remark-frontmatter";
import gfm from "remark-gfm";
import rehypeSlug from "rehype-slug";
import rehypeRaw from "rehype-raw";
import { nodeTypes } from "@mdx-js/mdx";
import callouts from "./remark-callouts";
import relativeLinks from "./remark-relative-links";
import mediaSources, { WEB_ASSETS_STORE } from "./rehype-media-sources";
import slugify from "@sindresorhus/slugify";
import { join } from "path";

import { buildPageIndex } from "./utils";

export { buildPageIndex, WEB_ASSETS_STORE };

interface TextToolChainOptions {
  contentDir: string;
  wikiPrefix?: string;
  /** Where documentation media must live; anything else is warned about at
   * compile time (see rehype-media-sources). */
  mediaStore?: string;
}

export default function viteTextToolchain({
  contentDir,
  wikiPrefix = "/",
  mediaStore = WEB_ASSETS_STORE,
}: TextToolChainOptions) {
  const [pageIndex, permalinkIndex] = buildPageIndex(contentDir, wikiPrefix);
  const permalinks = Object.keys(permalinkIndex);
  const permalinkByFile = new Map(
    Object.entries(permalinkIndex).map(([permalink, { contentFile }]) => [
      contentFile,
      permalink,
    ])
  );

  const include = [join(contentDir, "**/*.md"), "**/*.mdx"];

  return mdx({
    remarkPlugins: [
      [
        wikiLinks,
        {
          pageResolver: (name: string) =>
            pageIndex[name] || [
              slugify(name, { separator: "-", lowercase: true }),
            ],
          permalinks,
          hrefTemplate: (permalink: string) => `${permalink}`,
          aliasDivider: "|",
          wikiLinkClassName: "internal-link",
          newClassName: "not-created-yet",
        },
      ],
      [frontmatter, { type: "yaml", marker: "-" }],
      gfm,
      callouts,
      // `[Changelog](changelog.md)` between pages of the tree -> permalinks.
      [
        relativeLinks,
        {
          contentDir,
          permalinkForFile: (file: string) => permalinkByFile.get(file),
        },
      ],
    ],
    rehypePlugins: [
      // Raw HTML in plain markdown (`<video>`, `<figure>`, `<details>`) is
      // rendered rather than dropped. MDX nodes pass through untouched.
      [rehypeRaw, { passThrough: nodeTypes }],
      // Heading ids, so pages can link to their own sections (and the docs
      // sidebar can list them).
      rehypeSlug,
      [mediaSources, { contentDir, mediaStore }],
    ],
    include,
    // Extension = capability. `.md` is plain markdown (GFM + wikilinks +
    // callouts) and never fails on a stray `<` or `{`; `.mdx` may use JSX.
    mdExtensions: [".md"],
    mdxExtensions: [".mdx"],
  });
}
