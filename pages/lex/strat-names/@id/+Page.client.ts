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
} from "~/components/lex";
import { StratNameHierarchy } from "~/components/lex/StratNameHierarchy";
import { StratTag } from "~/components/general";
import { usePageContext } from "vike-react/usePageContext";

export function Page() {
  const { resData, colData, taxaData, refs, unitsData, fossilsData, mapsData } =
    useData();

  const id = usePageContext()?.urlPathname.split("/")?.[3] || [];
  const features = colData?.features || [];
  const timescales = resData?.timescales || [];

  const { strat_name_long } = resData || {};

  const children = [
    h(ColumnsTable, {
      resData,
      colData,
    }),
    h(Charts, { features }),
    h(PrevalentTaxa, { taxaData }),
    h(Timescales, { timescales }),
    h(Units, { unitsData }),
    h(Fossils, { fossilsData }),
    h(Maps, { mapsData }),
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
