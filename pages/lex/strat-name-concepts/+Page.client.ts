import { h } from "@macrostrat/map-interface";
import { PageBreadcrumbs } from "~/components";
import { ContentPage } from "~/layouts";

export function Page() {
  return h(ContentPage, [
    h(PageBreadcrumbs),
    h("div.names", [
      h("h2", "Stratigraphic Names"),
      h("p", [
        h("em", "Stratigraphic names"),
        " are the names of rock units, organized hierarchically.",
      ]),
    ]),
    h("div.concepts", [
      h("h2", "Stratigraphic Concepts"),
      h("p", [
        h("em", "Stratigraphic concepts"),
        " capture the complexity associated with the usage of stratigraphic names over a long period of time by many workers. A concept establishes a set of stratigraphic names that describe the same rock unit.",
      ]),
    ]),
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
