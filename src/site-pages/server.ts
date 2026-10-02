/** Server side of the site pages: find the vault page for a route, render its
 * markdown, split it into sections, and load the records its slots need.
 * Imported only from `+onBeforeRender` hooks. */
import { buildPageIndex } from "@macrostrat-web/text-toolchain";
import { renderToString } from "react-dom/server";
import h from "@macrostrat/hyper";
import { join } from "path";
import { parse as parseYaml } from "yaml";
import { slotDataFiles } from "./slots";
import { bibliography, platformPapers } from "./citations";
import { siteMarkdownComponents } from "./markdown-components";

const contentDirName = "../../content";
// Not relative to this file: the production build moves it into dist/server/chunks.
const contentDir = join(process.cwd(), "content");

const modules = import.meta.glob("../../content/**/*.{md,mdx}");
const dataFiles = import.meta.glob("../../content/Site/data/*.{yml,json}", {
  query: "?raw",
  import: "default",
  eager: true,
}) as Record<string, string>;

/** Record sets web derives from a vault data file before handing them to a
 * slot. A missing file gives an empty set, so the page renders either way. */
const derivedData: Record<string, () => unknown> = {
  publications: () => bibliography(readDataFile("publications") ?? []),
  platformPapers: () => platformPapers(readDataFile("publications") ?? []),
};

/** route -> vault page, from the `route:` frontmatter of site pages. */
const [, permalinkIndex] = buildPageIndex(contentDir, "/docs");
const routeIndex: Record<string, { contentFile: string; title: string }> = {};
for (const entry of Object.values(permalinkIndex)) {
  if (entry.route != null) {
    routeIndex[entry.route] = { contentFile: entry.contentFile, title: entry.title };
  }
}

export interface SiteSection {
  /** Heading id, from rehype-slug; null for the lead section before any H2. */
  id: string | null;
  /** Inner HTML of the heading. */
  heading: string | null;
  /** HTML of the section body. */
  html: string;
}

export interface SitePageData {
  siteRoute: string;
  siteTitle: string;
  siteSections: SiteSection[];
  siteData: Record<string, unknown>;
  /** Breadcrumb labels for this route and its ancestors, keyed by URL slug. */
  siteCrumbs: Record<string, string>;
}

export function hasSitePage(route: string): boolean {
  return routeIndex[route] != null;
}

export async function renderSitePage(route: string): Promise<SitePageData | null> {
  const page = routeIndex[route];
  if (page == null) return null;
  const pageModule = modules[join(contentDirName, page.contentFile)];
  if (pageModule == null) return null;

  const mod: any = await pageModule();
  const html = stripLeadingH1(renderToString(h(mod.default, { components: siteMarkdownComponents })));

  return {
    siteRoute: route,
    siteTitle: page.title,
    siteSections: splitSections(html),
    siteData: loadSiteData(slotDataFiles(route)),
    siteCrumbs: crumbLabels(route),
  };
}

/** `/about/support` -> { about: "About Macrostrat", support: "Support" }, from
 * the titles of the site pages along the route. A missing ancestor page keeps
 * its slug. */
function crumbLabels(route: string): Record<string, string> {
  const labels: Record<string, string> = {};
  const segments = route.split("/").filter(Boolean);
  for (let i = 0; i < segments.length; i++) {
    const ancestor = "/" + segments.slice(0, i + 1).join("/");
    const page = routeIndex[ancestor];
    if (page != null) labels[segments[i]] = page.title;
  }
  return labels;
}

function loadSiteData(names: string[]): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const name of names) {
    const derive = derivedData[name];
    if (derive != null) {
      out[name] = derive();
      continue;
    }
    const data = readDataFile(name);
    if (data != null) out[name] = data;
  }
  return out;
}

const parsedData = new Map<string, any>();

/** `Site/data/<name>.yml` or `.json`, parsed once. */
function readDataFile(name: string): any {
  if (parsedData.has(name)) return parsedData.get(name);
  const base = `../../content/Site/data/${name}`;
  let data = null;
  if (dataFiles[`${base}.yml`] != null) {
    data = parseYaml(dataFiles[`${base}.yml`]);
  } else if (dataFiles[`${base}.json`] != null) {
    data = JSON.parse(dataFiles[`${base}.json`]);
  } else {
    console.warn(`[site-pages] no data file Site/data/${name}.yml or .json`);
  }
  parsedData.set(name, data);
  return data;
}

function stripLeadingH1(html: string): string {
  return html.replace(/^\s*<h1\b[^>]*>[\s\S]*?<\/h1>/, "");
}

const H2 = /^<h2\b([^>]*)>([\s\S]*?)<\/h2>/;

function splitSections(html: string): SiteSection[] {
  const chunks = html.split(/(?=<h2\b)/);
  const sections: SiteSection[] = [];
  for (const chunk of chunks) {
    const m = H2.exec(chunk);
    if (m == null) {
      if (chunk.trim() !== "") sections.push({ id: null, heading: null, html: chunk });
      continue;
    }
    const idMatch = /\bid="([^"]+)"/.exec(m[1]);
    sections.push({
      id: idMatch?.[1] ?? null,
      heading: m[2],
      html: chunk.slice(m[0].length),
    });
  }
  return sections;
}
