import h from "@macrostrat/hyper";
import { CenteredContentPage } from "~/layouts";
import { PageHeader } from "~/components";
import { usePageContext } from "vike-react/usePageContext";

export function Page() {
  const ctx = usePageContext();
  const is404 = ctx.is404;

  return h(CenteredContentPage, [
    h(PageHeader, { title: "Macrostrat" }),
    h(PageContent, { is404, path: ctx.urlPathname }),
  ]);
}

function PageContent({ is404, path }: { is404: boolean; path: string }) {
  if (is404) {
    return h([
      h("h1", [h("code.bp5-code", "404"), " Page Not Found"]),
      h("p", ["Could not find a page at path ", h("code.bp5-code", path), "."]),
    ]);
  } else {
    return h([
      h("h1", "Internal Error"),
      h("p", ["Something went wrong."]),
      h("p", ["Code: ", h("code", "500")]),
    ]);
  }
}
