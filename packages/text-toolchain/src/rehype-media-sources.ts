/** Warn about media that is not served from the asset store.
 *
 * Documentation media (screenshots, videos) belongs in the object store under
 * one prefix, `https://storage.macrostrat.org/assets/web/…`. Pages reference it
 * by that absolute URL so they preview on GitHub and the vault's reference check
 * can verify it, and the site rewrites the prefix to its own web-assets base at
 * render time so the media is served same-origin through its cache. Media from
 * anywhere else — another host, a root-relative or relative path — is left as
 * written and cannot be localized, so it is reported here, at compile time, with
 * the page that references it.
 */

import { visit } from "unist-util-visit";
import { relative } from "path";

/** The asset store prefix that the published site knows how to localize. */
export const WEB_ASSETS_STORE = "https://storage.macrostrat.org/assets/web";

export interface MediaSourceOptions {
  contentDir: string;
  /** Media URLs must start with this prefix (default: the asset store). */
  mediaStore?: string;
}

interface ElementNode {
  type: string;
  tagName?: string;
  properties?: Record<string, unknown>;
}

const MEDIA_TAGS = new Set(["img", "video", "audio", "source"]);

export default function rehypeMediaSources({
  contentDir,
  mediaStore = WEB_ASSETS_STORE,
}: MediaSourceOptions) {
  const prefix = mediaStore.replace(/\/+$/, "") + "/";

  return (tree: any, file: { path?: string }) => {
    const filePath = file.path?.split("?")[0];
    const page = filePath == null ? "?" : relative(contentDir, filePath);

    visit(tree, "element", (node: ElementNode) => {
      if (!MEDIA_TAGS.has(node.tagName ?? "")) return;
      const src = node.properties?.src;
      if (typeof src !== "string" || src.startsWith("data:")) return;
      if (src.startsWith(prefix)) return;
      console.warn(
        `[text-toolchain] ${page}: media outside the asset store (${prefix}) ` +
          `is served as written and not localized by the site: ${src}`
      );
    });
  };
}
