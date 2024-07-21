import h from "@macrostrat/hyper";
import { Link } from "~/components";
import { usePageContext } from "vike-react/usePageContext";
import { ErrorBoundary } from "@macrostrat/ui-components";
import { ContentPage } from "~/layouts";
import { PageBreadcrumbs } from "~/components";
import { Popover, Tag } from "@blueprintjs/core";

export function Page() {
  const ctx = usePageContext();
  const { title } = ctx;

  if (ctx.mdxContent == null) {
    return h("div.page-404", [
      h("h1", "Page not found"),
      h(Link, { href: "/" }, ["Go to home page"]),
    ]);
  }

  // Check if we need to hydrate the page
  const _contentStr = ctx.mdxContent;

  // If we're on the server, we just render the content from a string, otherwise we hydrate it
  const pageContent = h("div", {
    dangerouslySetInnerHTML: { __html: _contentStr },
  });

  return h(ContentPage, [
    h(FlexRow, [h(PageBreadcrumbs), h("div.spacer"), h(BetaTagWithPopup)]),
    h("h1", title),
    h(ErrorBoundary, [pageContent]),
  ]);
}

function BetaTagWithPopup() {
  return h(
    Popover,
    {
      content:
        "This wiki-based documentation is in beta and may be incomplete.",
    },
    [h(Tag, { intent: "warning" }, "Beta")]
  );
}

function FlexRow({ children }) {
  return h("div.flex-row", children);
}
