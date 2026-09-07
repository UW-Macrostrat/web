import { buildPageIndex } from "@macrostrat-web/text-toolchain";
import { renderToString } from "react-dom/server";
import { PageContext } from "vike/types";
import { render } from "vike/abort";
import h from "@macrostrat/hyper";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import {
  buildDocsNav,
  crumbLabels,
  findTrail,
  type DocsNavNode,
} from "./nav";

const modules = import.meta.glob("../../../content/**/*.{md,mdx}");

const __dirname = dirname(fileURLToPath(import.meta.url));

const contentDirName = "../../../content";
const contentDir = join(__dirname, contentDirName);
const prefix = "/docs";

const [pageIndex, permalinkIndex] = buildPageIndex(contentDir, prefix);
const docsNav = buildDocsNav(permalinkIndex, prefix);

export interface SectionIndex {
  label: string;
  children: DocsNavNode[];
}

export interface TocEntry {
  depth: number;
  id: string;
  text: string;
}

type DocsPageContext = {
  mdxContent: string | null;
  title: string | null;
  docsNav: DocsNavNode;
  docsCrumbs: Record<string, string>;
  docsToc: TocEntry[];
  sectionIndex: SectionIndex | null;
};

/** The page title is shown by the breadcrumb header, so the article's own
 * leading H1 would repeat it. */
function stripLeadingH1(html: string): string {
  return html.replace(/^\s*<h1\b[^>]*>[\s\S]*?<\/h1>/, "");
}

const HEADING = /<h([23])\b[^>]*\bid="([^"]+)"[^>]*>([\s\S]*?)<\/h\1>/g;

function extractToc(html: string): TocEntry[] {
  const toc: TocEntry[] = [];
  for (const m of html.matchAll(HEADING)) {
    const text = m[3]
      .replace(/<[^>]+>/g, "")
      .replace(/&#x27;|&#39;/g, "'")
      .replace(/&quot;/g, '"')
      .replace(/&amp;/g, "&")
      .trim();
    toc.push({ depth: Number(m[1]), id: m[2], text });
  }
  return toc;
}

export async function onBeforeRender(
  pageContext: PageContext
): Promise<{ pageContext: DocsPageContext }> {
  /** Server-side render hook for documentation pages */

  const key = pageContext.urlPathname.replace(/\/+$/, "") || "/";
  const page = permalinkIndex[key];
  const trail = findTrail(docsNav, key);
  const docsCrumbs = crumbLabels(trail);

  if (page == null) {
    // A section directory without a page of its own gets a generated index.
    const node = trail?.[trail.length - 1];
    if (node != null && node.children.length > 0) {
      return {
        pageContext: {
          mdxContent: null,
          title: node.label,
          docsNav,
          docsCrumbs,
          docsToc: [],
          sectionIndex: { label: node.label, children: node.children },
        },
      };
    }
    throw render(404, "No documentation page at this address");
  }

  const pageModule = modules[join(contentDirName, page.contentFile)];
  if (pageModule == null) {
    throw render(404, "No documentation page at this address");
  }

  const mod: any = await pageModule();
  const html = renderToString(h(mod.default));
  const mdxContent = stripLeadingH1(html);

  return {
    pageContext: {
      mdxContent,
      title: page.title,
      docsNav,
      docsCrumbs,
      docsToc: extractToc(mdxContent),
      sectionIndex: null,
    },
  };
}
