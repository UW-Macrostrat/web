import mdx from "@mdx-js/rollup";
import wikiLinks from "remark-wiki-link";
import frontmatter from "remark-frontmatter";
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

  console.log(pageIndex, permalinkIndex);

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
    ],
    include,
    // Treat all .md files as MDX
    mdxExtensions: [".mdx", ".md"],
    mdExtensions: [],
  });
}
