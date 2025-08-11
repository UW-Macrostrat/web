import { useData } from "vike-react/useData";
import h from "./main.module.sass";
import {
  LexItemPage,
  ColumnsTable,
  Charts,
  PrevalentTaxa,
  Timescales,
  ConceptInfo,
  Units,
  Fossils,
  Maps,
  Matches
} from "~/components/lex";
import { StratTag } from "~/components/general";
import { LinkCard } from "~/components/cards";
import { usePageContext } from "vike-react/usePageContext";

export function Page() {
  const { resData, refs, fossilsData, colData, taxaData, unitsData } = useData();

  const id = usePageContext()?.urlPathname.split("/")?.[3] || [];
  const features = colData?.features || [];
  const timescales = resData?.timescales || [];
  const { name } = resData || {};


  const children = [
    h(ColumnsTable, {
      resData,
      colData,
      fossilsData
    }),
    h(Charts, { features }),
    h(PrevalentTaxa, { taxaData }),
    h(Timescales, { timescales }),
    h(ConceptInfo, { concept_id: id, showHeader: true }),
    h(ConceptBody, { resData }),
    h.if(unitsData.length > 0)(Units, { href: "strat_name_concept_id=" + id + "&name=" + resData?.name }),
    h.if(fossilsData.length > 0)(Fossils, { href: "strat_name_concept_id=" + id + "&name=" + resData?.name }),
    h(Matches, {
      concept_id: id,
    }),
  ];

  return LexItemPage({
    children,
    id,
    refs,
    resData,
    siftLink: "strat_name_concept",
    header: h("div.concept-header", [
      h("h1.concept-title", name),
      h(StratTag, { isConcept: true, fontSize: "1.6em" }),
    ]),
  });
}

function ConceptBody({ resData }) {
  let { strat_names, strat_ids, strat_ranks } = resData;

  const stratNames = strat_names ? strat_names.split(",") : [];
  const stratIds = strat_ids ? strat_ids.split(",") : [];
  const stratRanks = strat_ranks ? strat_ranks.split(",") : [];
  const strats = stratNames.map((name, i) => ({
    name,
    id: stratIds[i],
    rank: stratRanks[i],
  }));

  return h("div.concept-body", [
    h("h2.strat-names", "Strat Names"),
    h(
      "ul.strat-name-list",
      strats.map((strat) =>
        h(
          LinkCard,
          { href: "/lex/strat-names/" + strat.id, className: "strat-name" },
          strat.name + " (" + strat.rank + ")"
        )
      )
    ),
  ]);
}
