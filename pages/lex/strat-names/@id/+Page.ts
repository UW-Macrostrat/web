import { useData } from "vike-react/useData";
import h from "@macrostrat/hyper";
import {
  LexItemPage,
  ColumnsTable,
  Charts,
  PrevalentTaxa,
  Timescales,
  ConceptInfo,
} from "~/components/lex";
import { StratNameHierarchy } from "~/components/lex/StratNameHierarchy";

export function Page() {
  const { resData, colData, taxaData, refs } = useData();

  const id = resData.strat_name_id;
  const features = colData?.features || [];
  const timescales = resData?.timescales || [];

  const children = [
    h(ConceptInfo, { concept_id: resData?.concept_id, showHeader: true }),
    h(ColumnsTable, {
      resData,
      colData,
    }),
    h(Charts, { features }),
    h(PrevalentTaxa, { taxaData }),
    h(StratNameHierarchy, { id }),
    h(Timescales, { timescales }),
  ];

  return LexItemPage({ children, id, refs, resData, siftLink: "strat-name" });
}
