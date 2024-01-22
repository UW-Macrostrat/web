export { Page };

import h from "@macrostrat/hyper";

function Page({ is404 }: { is404: boolean }) {
  if (is404) {
    return h([
      h("h1", "404 Page Not Found"),
      h("p", "This page could not be found."),
    ]);
  } else {
    return h([h("h1", "500 Internal Error"), h("p", "Something went wrong.")]);
  }
}
