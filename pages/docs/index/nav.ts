/** Navigation tree for the documentation section, derived from the assembled
 * content tree: directories become sections, pages become leaves, and a
 * README/index page stands for its directory. Built once on the server and
 * passed to the client with the page context. */

import type { PermalinkIndex } from "@macrostrat-web/text-toolchain";

export interface DocsNavNode {
  label: string;
  /** URL of the node. Sections always have one; a section without its own
   * page gets a generated index (see +onBeforeRender). */
  href: string;
  /** True for a section that has no README/index page of its own. */
  generated?: boolean;
  children: DocsNavNode[];
}

export function buildDocsNav(
  permalinkIndex: PermalinkIndex,
  prefix: string
): DocsNavNode {
  const root: DocsNavNode = {
    label: "Documentation",
    href: prefix,
    children: [],
  };

  const entries = Object.entries(permalinkIndex).sort(([a], [b]) =>
    a.localeCompare(b)
  );

  for (const [href, { title, contentFile }] of entries) {
    const rel = href.slice(prefix.length).replace(/^\//, "");
    if (rel === "") continue; // the landing page is the root itself

    const dirs = contentFile.split("/").slice(0, -1);
    const urlSegments = rel.split("/");
    const isSectionPage = urlSegments.length === dirs.length;

    let node = root;
    for (let i = 0; i < dirs.length; i++) {
      const sectionHref = [prefix, ...urlSegments.slice(0, i + 1)].join("/");
      node = ensureSection(node, sectionHref, dirs[i]);
    }

    if (isSectionPage) {
      node.href = href;
      node.generated = false;
      node.label = title;
    } else {
      node.children.push({ label: title, href, children: [] });
    }
  }

  sortTree(root);
  return root;
}

function ensureSection(
  parent: DocsNavNode,
  href: string,
  dirName: string
): DocsNavNode {
  let section = parent.children.find((c) => c.href === href);
  if (section == null) {
    section = {
      label: humanize(dirName),
      href,
      generated: true,
      children: [],
    };
    parent.children.push(section);
  }
  return section;
}

/** Pages first, then sections, each alphabetically. */
function sortTree(node: DocsNavNode) {
  node.children.sort((a, b) => {
    const aSection = a.children.length > 0 || a.generated != null;
    const bSection = b.children.length > 0 || b.generated != null;
    if (aSection !== bSection) return aSection ? 1 : -1;
    return a.label.localeCompare(b.label);
  });
  for (const child of node.children) sortTree(child);
}

function humanize(dirName: string): string {
  const spaced = dirName.replace(/[-_]+/g, " ").trim();
  if (/[A-Z]/.test(spaced)) return spaced;
  return spaced.charAt(0).toUpperCase() + spaced.slice(1);
}

/** Nodes from the root down to the node at `href`, or null if none matches. */
export function findTrail(root: DocsNavNode, href: string): DocsNavNode[] | null {
  if (root.href === href) return [root];
  for (const child of root.children) {
    const trail = findTrail(child, href);
    if (trail != null) return [root, ...trail];
  }
  return null;
}

/** Breadcrumb labels keyed by URL slug, for the site's breadcrumb bar. */
export function crumbLabels(trail: DocsNavNode[] | null): Record<string, string> {
  const labels: Record<string, string> = {};
  for (const node of trail ?? []) {
    const slug = node.href.slice(node.href.lastIndexOf("/") + 1);
    labels[slug] = node.label;
  }
  return labels;
}
