export { Page };

import h from "@macrostrat/hyper";
import { CenteredContentPage } from "~/layouts";

function PageContent({ is404 }: { is404: boolean }) {
  if (is404) {
    return h([
      h("h1", "404 Page Not Found"),
      h("p", "This page could not be found."),
    ]);
  } else {
    return h([h("h1", "500 Internal Error"), h("p", "Something went wrong.")]);
  }
}

function Page({ is404 }: { is404: boolean }) {
  return h(CenteredContentPage, h(PageContent, { is404 }));
}
