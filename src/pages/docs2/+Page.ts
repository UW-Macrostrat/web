import h from "@macrostrat/hyper";
import { Link } from "~/components";
import { usePageContext } from "~/renderer/page-context";
import { ErrorBoundary } from "@macrostrat/ui-components";
import { ContentPage } from "~/layouts";
import { PageBreadcrumbs } from "~/renderer";

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
    h(PageBreadcrumbs),
    h("h1", title),
    h(ErrorBoundary, [pageContent]),
  ]);
}
