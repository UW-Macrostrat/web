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
} from "~/components/lex";
import {
  useLexColumns,
  useLexFossils,
  useLexTaxa,
  useLexUnits,
} from "~/components/lex/item-atoms";
import { StratTag } from "~/components/general";
import { LinkCard } from "~/components/cards";
import { usePageContext } from "vike-react/usePageContext";
import { fetchAPIData } from "~/_utils";
import { useEffect, useState } from "react";

export function Page() {
  const { resData, refs } = useData();
  const id = usePageContext().routeParams.id;

  const itemRef = { type: "strat-concepts", id: Number(id) };
  const colData = useLexColumns(itemRef);
  const fossilsData = useLexFossils(itemRef);
  const taxaData = useLexTaxa(itemRef);
  const unitsData = useLexUnits(itemRef);

  const features = colData?.features || [];
  const timescales = resData?.timescales || [];
  const { name } = resData || {};
  const relatedHref = "strat_name_concept_id=" + id + "&name=" + resData?.name;

  const children = [
    h(ConceptInfo, { concept_id: id, showHeader: false }),
    h(ColumnsTable, {
      resData,
      colData,
      fossilsData,
      mapUrl: "strat_name_concept=" + id,
    }),
    h(Charts, { features }),
    h(PrevalentTaxa, { taxaData }),
    h(Timescales, { timescales }),
    h(ConceptBody, { concept_id: id }),
    h.if(unitsData?.length > 0)(Units, { href: relatedHref }),
    h.if(fossilsData?.features?.length > 0)(Fossils, { href: relatedHref }),
  ];

  return h(LexItemPage, {
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
      })
      .catch((error) => {
        console.error("Error fetching strat names:", error);
        setData(null);
      });
  }, [concept_id]);

  if (!data) return null;

  return h("div.concept-body", [
    h("h2.strat-names", "Usages"),
    h(
      "ul.strat-name-list",
      data.map((strat) =>
        h(
          LinkCard,
          {
            href: "/lex/strat-names/" + strat.strat_name_id,
            className: "strat-name",
          },
          strat.strat_name_long + " (" + strat.t_units + ")"
        )
      )
    ),
  ]);
}
