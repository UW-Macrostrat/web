import { h } from "@macrostrat/map-interface";
import { PageBreadcrumbs } from "~/components";
import { ContentPage } from "~/layouts";

export function Page() {
  return h(ContentPage, [
    h(PageBreadcrumbs),
    h(
      "h2",
      "Stratigraphic names are the names of rock units, organized hierarchically."
    ),
    h(
      "h2",
      "Stratigraphic concepts capture relationships between differently-named rock units."
    ),
    h(
      "h2",
      h(
        "a",
        { href: "/lex/strat-names" },
        "Click here to search strat names and concepts"
      )
    ),
  ]);
}
