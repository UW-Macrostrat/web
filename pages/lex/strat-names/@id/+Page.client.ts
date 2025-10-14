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
import { StratNameHierarchy } from "~/components/lex/StratNameHierarchy";
import { StratTag } from "~/components/general";
import { usePageContext } from "vike-react/usePageContext";

export function Page() {
  const { resData, colData, taxaData, refs, fossilsData, mapsData, unitsData } =
    useData();

  const id = usePageContext()?.urlPathname.split("/")?.[3] || [];
  const features = colData?.features || [];
  const timescales = resData?.timescales || [];

  const { strat_name_long } = resData || {};

  const children = [
    h(ColumnsTable, {
      resData,
      colData,
      fossilsData
    }),
    h(Charts, { features }),
    h(PrevalentTaxa, { taxaData }),
    h(Timescales, { timescales }),
    h.if(unitsData.length > 0)(Units, { href: "strat_name_id=" + id + "&name=" + resData?.strat_name }),
    // h.if(mapsData?.length > 0)(Maps, { href: "strat_name_id=" + id + "&name=" + resData?.name }), (add strat names to legends view first)
    h.if(fossilsData.features.length > 0)(Fossils, { href: "strat_name_id=" + id + "&name=" + resData?.name }),
    h(StratNameHierarchy, { id }),
    h(ConceptInfo, { concept_id: resData?.concept_id, showHeader: true }),
  ];

  return h(LexItemPage, 
    {
      children,
      id,
      refs,
      resData,
      siftLink: "strat-name",
      header: h("div.strat-header", [
        h("h1.strat-title", strat_name_long),
        h(StratTag, { isConcept: false, fontSize: "1.6em" }),
      ]),
    }
  );
}
