export { Page };

import h from "@macrostrat/hyper";
import { CenteredContentPage } from "~/layouts";
import { PageHeader } from "~/components";

function PageContent({ is404 }: { is404: boolean }) {
  if (is404) {
    return h([
      h("h1", "Page Not Found"),
      h("p", " This page could not be found."),
      h("p", ["Code: ", h("code", "404")]),
    ]);
  } else {
    return h([
      h("h1", "Internal Error"),
      h("p", ["Something went wrong."]),
      h("p", ["Code: ", h("code", "500")]),
    ]);
  }
}

function Page({ is404 }: { is404: boolean }) {
  return h(CenteredContentPage, [
    h(PageHeader, { title: "Macrostrat" }, [h("span.secondary", "v2")]),
    h(PageContent, { is404 }),
  ]);
}
