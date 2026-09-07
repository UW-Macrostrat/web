import mdx from "@mdx-js/rollup";
import wikiLinks from "remark-wiki-link";
import frontmatter from "remark-frontmatter";
import gfm from "remark-gfm";
import rehypeSlug from "rehype-slug";
import callouts from "./remark-callouts";
import slugify from "@sindresorhus/slugify";
import { join } from "path";

import { buildPageIndex } from "./utils";

export { buildPageIndex };

interface TextToolChainOptions {
  contentDir: string;
  wikiPrefix?: string;
}

export default function viteTextToolchain({
  contentDir,
  wikiPrefix = "/",
}: TextToolChainOptions) {
  const [pageIndex, permalinkIndex] = buildPageIndex(contentDir, wikiPrefix);
  const permalinks = Object.keys(permalinkIndex);

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
    ],
    // Heading ids, so pages can link to their own sections (and the docs
    // sidebar can list them).
    rehypePlugins: [rehypeSlug],
    include,
    // Extension = capability. `.md` is plain markdown (GFM + wikilinks +
    // callouts) and never fails on a stray `<` or `{`; `.mdx` may use JSX.
    mdExtensions: [".md"],
    mdxExtensions: [".mdx"],
  });
}
