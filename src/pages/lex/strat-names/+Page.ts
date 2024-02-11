import h from "@macrostrat/hyper";
import { ContentPage } from "~/layouts";
import { PageHeader, Link } from "~/components";
import { AttributedLithTag } from "~/components";
import { InputGroup } from "@blueprintjs/core";
import { InfiniteScroll } from "@macrostrat/ui-components";

export function Page({ data, filters }) {
  return h(ContentPage, [
    h(PageHeader, { title: "Stratigraphic names" }),
    h(FilterControl, { filters }),
    h(StratNamesView, { data }),
  ]);
}

function FilterControl({ filters }) {
  return h("div.filter-control", [
    h(InputGroup, { leftIcon: "filter", placeholder: "Filter" }),
  ]);
}

function StratNamesView({ data }) {
  return h(
    InfiniteScroll,
    {
      hasMore: false,
      loadMore: () => {
        console.log("Load more");
      },
    },
    h(StratNamesList, { data })
  );
}

function StratNamesList({ data }) {
  return h("div.strat-names-list", [
    data.map((d) => h(StratNameItem, { data: d })),
  ]);
}

const ranks = {
  Fm: "Formation",
  Mbr: "Member",
  Gp: "Group",
  Sgp: "Supergroup",
};

function StratNameItem({ data }) {
  const { kg_liths, liths, units, id } = data;
  return h("div.strat-name", {}, [
    h(
      Link,
      { href: `/lex/strat-names/${id}` },
      h("h2.strat-name", [
        data.strat_name,
        " ",
        h("span", ranks[data.rank] ?? data.rank),
      ])
    ),
    h("p", [`in ${units.length} columns`]),
    h("div.strat-name-details", [h(Liths, { liths })]),
    h.if(kg_liths != null)("div.strat-name-details", [
      h(Liths, { liths: kg_liths, candidate: true }),
    ]),
  ]);
}

function Liths({ liths, candidate = false }) {
  return h(
    "p.liths",
    liths.map((lith, i) => {
      return h(AttributedLithTag, { key: i, lith, candidate });
    })
  );
}
