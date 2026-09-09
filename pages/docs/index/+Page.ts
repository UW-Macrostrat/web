import hyper from "@macrostrat/hyper";
import { Link, PageBreadcrumbs } from "~/components";
import { BaseContentPage, Footer } from "~/layouts";
import { usePageContext } from "vike-react/usePageContext";
import { Popover, Tag } from "@blueprintjs/core";
import { findTrail, type DocsNavNode } from "./nav";
import type { TocEntry } from "./+onBeforeRender";
import styles from "./docs-layout.module.sass";
import "./docs-content.sass";

const h = hyper.styled(styles);

export function Page() {
  const ctx = usePageContext();
  const { docsNav, docsToc, sectionIndex, mdxContent, urlPathname } =
    ctx as any;

  const trail = findTrail(docsNav, urlPathname) ?? [];
  const currentNode = trail[trail.length - 1];
  const childPages = currentNode?.children ?? [];
  const toc: TocEntry[] = docsToc ?? [];

  let body;
  if (sectionIndex != null) {
    body = h(SectionIndexPage, { section: sectionIndex });
  } else if (mdxContent != null) {
    // Server-rendered markdown, injected as HTML (not hydrated).
    body = h("div.docs-content", {
      dangerouslySetInnerHTML: { __html: mdxContent },
    });
  } else {
    body = h("div.page-404", [
      h("h1", "Page not found"),
      h(Link, { href: "/docs" }, ["Go to the documentation index"]),
    ]);
  }

  const hasSidebar = childPages.length > 0 || toc.length > 0;
  let sidebar = null;
  let layoutClass = "single-column";
  if (hasSidebar) {
    sidebar = h(DocsSidebar, { childPages, toc });
    layoutClass = "with-sidebar";
  }

  return h(BaseContentPage, { className: "docs-page" }, [
    h("header.docs-header", [
      h(PageBreadcrumbs, { separateTitle: true }),
      h(BetaTagWithPopup),
    ]),
    h("div.docs-layout", { className: layoutClass }, [
      h("article.docs-main", body),
      sidebar,
    ]),
    h(Footer),
  ]);
}

/** Subsidiary navigation: the pages beneath this one, then this page's own
 * sections. The breadcrumb header is the primary navigation. */
function DocsSidebar({
  childPages,
  toc,
}: {
  childPages: DocsNavNode[];
  toc: TocEntry[];
}) {
  let sectionBlock = null;
  if (childPages.length > 0) {
    sectionBlock = h("div.sidebar-block", [
      h("h4.sidebar-heading", "In this section"),
      h(
        "ul.child-pages",
        childPages.map((node) => h(ChildPageItem, { key: node.href, node }))
      ),
    ]);
  }

  let tocBlock = null;
  if (toc.length > 0) {
    tocBlock = h("div.sidebar-block", [
      h("h4.sidebar-heading", "On this page"),
      h(
        "ul.toc",
        toc.map((entry) =>
          h(
            "li",
            { key: entry.id, className: `toc-depth-${entry.depth}` },
            h("a", { href: `#${entry.id}` }, entry.text)
          )
        )
      ),
    ]);
  }

  return h("aside.docs-sidebar", [sectionBlock, tocBlock]);
}

function ChildPageItem({ node }: { node: DocsNavNode }) {
  const isSection = node.children.length > 0 || node.generated != null;
  let marker = null;
  if (isSection) {
    marker = h("span.descend-marker", { "aria-hidden": true }, "›");
  }
  return h("li", h(Link, { href: node.href }, [node.label, marker]));
}

function SectionIndexPage({ section }) {
  return h("div.section-index", [h(IndexList, { nodes: section.children })]);
}

function IndexList({ nodes }: { nodes: DocsNavNode[] }) {
  return h(
    "ul",
    nodes.map((node) => {
      let nested = null;
      if (node.children.length > 0) {
        nested = h(IndexList, { nodes: node.children });
      }
      return h("li", { key: node.href }, [
        h(Link, { href: node.href }, [node.label]),
        nested,
      ]);
    })
  );
}

function BetaTagWithPopup() {
  return h(
    Popover,
    {
      content:
        "This wiki-based documentation is in beta and may be incomplete.",
    },
    [h(Tag, { intent: "warning", minimal: true }, "Beta")]
  );
}
