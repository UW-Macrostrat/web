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
  TextExtractions
} from "~/components/lex";
import { StratTag } from "~/components/general";
import { LinkCard } from "~/components/cards";
import { usePageContext } from "vike-react/usePageContext";
import { fetchAPIData } from "~/_utils";
import { useEffect, useState } from "react";
import { ConceptHierarchy } from "~/components/lex/StratNameHierarchy";

export function Page() {
  const { resData, refs, fossilsData, colData, taxaData, unitsData } = useData();

  const id = usePageContext()?.urlPathname.split("/")?.[3] || [];
  const features = colData?.features || [];
  const timescales = resData?.timescales || [];
  const { name } = resData || {};


  const children = [
    h(ConceptInfo, { concept_id: id, showHeader: false }),
    h(ColumnsTable, {
      resData,
      colData,
      fossilsData,
      mapUrl: "strat_name_concept=" + id 
    }),
    h(Charts, { features }),
    h(PrevalentTaxa, { taxaData }),
    h(Timescales, { timescales }),
    h(ConceptBody, { concept_id: id }),
    h.if(unitsData.length > 0)(Units, { href: "strat_name_concept_id=" + id + "&name=" + resData?.name }),
    h.if(fossilsData.length > 0)(Fossils, { href: "strat_name_concept_id=" + id + "&name=" + resData?.name }),
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

function ConceptBody({ concept_id }) {
  const [data, setData] = useState(null);

  useEffect(() => {
    if (!concept_id) return; // Avoid calling API with undefined/null ID

    fetchAPIData(`/defs/strat_names`, { concept_id })
      .then((response) => {
        setData(response);
        console.log("Linked strat names", response);
      })
      .catch((error) => {
        console.error("Error fetching strat names:", error);
        setData(null);
      });
  }, [concept_id]);

  if (!data) return null;

  return h("div.concept-body", [
    h("h2.strat-names", "Contains strat names"),
    h(
      "ul.strat-name-list",
      data.map((strat) =>
        h(
          LinkCard,
          { href: "/lex/strat-names/" + strat.strat_name_id, className: "strat-name" },
          strat.strat_name_long + " (" + strat.t_units + ")"
        )
      )
    ),
  ]);
}
