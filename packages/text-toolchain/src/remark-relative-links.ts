/** Resolve relative markdown links between pages of the content tree.
 *
 * Code-coupled documentation is read in its home repository (on GitHub, in an
 * editor) as well as on the published site, so pages link to their siblings the
 * way any repository README does: `[Changelog](changelog.md)`,
 * `[Overview](../README.md#usage)`. Once the tree is assembled and published,
 * those files are rendered at permalinks without extensions, so the raw link
 * would 404. This plugin rewrites such links to the permalink of the file they
 * point at, keeping any `#fragment`.
 *
 * Only relative links to `.md` / `.mdx` files are touched. Absolute paths,
 * fragments, URLs with a scheme, and links whose target is not a page of the
 * tree are left alone.
 */

import { visit } from "unist-util-visit";
import { dirname, isAbsolute, join, normalize, relative } from "path";

export interface RelativeLinkOptions {
  /** Root of the content tree the pages are compiled from. */
  contentDir: string;
  /** Permalink of a page, given its path relative to `contentDir`. */
  permalinkForFile: (contentFile: string) => string | undefined;
}

interface LinkNode {
  type: string;
  url?: string;
}

const HAS_SCHEME = /^[a-z][a-z0-9+.-]*:/i;
const PAGE_EXTENSION = /\.mdx?$/i;

function splitFragment(url: string): [string, string | null] {
  const i = url.indexOf("#");
  if (i === -1) return [url, null];
  return [url.slice(0, i), url.slice(i + 1)];
}

function isRelativePageLink(target: string): boolean {
  if (target === "" || target.startsWith("/") || HAS_SCHEME.test(target)) {
    return false;
  }
  return PAGE_EXTENSION.test(target);
}

export default function remarkRelativeLinks({
  contentDir,
  permalinkForFile,
}: RelativeLinkOptions) {
  return (tree: any, file: { path?: string }) => {
    if (file.path == null) return;
    // Vite module ids may carry a query string.
    const filePath = file.path.split("?")[0];
    const contentFile = relative(contentDir, filePath);
    if (contentFile.startsWith("..") || isAbsolute(contentFile)) return;
    const pageDir = dirname(contentFile);

    visit(tree, ["link", "definition"], (node: LinkNode) => {
      const url = node.url;
      if (url == null) return;
      const [target, fragment] = splitFragment(url);
      if (!isRelativePageLink(target)) return;

      const targetFile = normalize(join(pageDir, decodeURI(target)));
      const permalink = permalinkForFile(targetFile);
      if (permalink == null) return;

      node.url = fragment == null ? permalink : `${permalink}#${fragment}`;
    });
  };
}
