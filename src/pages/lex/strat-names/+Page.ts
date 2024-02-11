import h from "@macrostrat/hyper";
import { ContentPage } from "~/layouts";
import { PageHeader } from "~/components";
import { AttributedLithTag } from "~/components";

export function Page({ data }) {
  return h(ContentPage, [
    h(PageHeader, { title: "Stratigraphic names" }),
    h(StratNamesList, { data }),
  ]);
}

function StratNamesList({ data }) {
  return h(
    "ul",
    data.map((d) => h(StratNameItem, { data: d, key: d.id }))
  );
}

const ranks = {
  Fm: "Formation",
  Mbr: "Member",
  Gp: "Group",
  Sgp: "Supergroup",
};

function StratNameItem({ data }) {
  const { kg_liths, liths, units } = data;
  return h("div.strat-name", {}, [
    h("h2.strat-name", [
      data.strat_name,
      " ",
      h("span", ranks[data.rank] ?? data.rank),
    ]),
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
