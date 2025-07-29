import { useData } from "vike-react/useData";
import h from "@macrostrat/hyper";
import {
  LexItemPage,
  ColumnsTable,
  Charts,
  PrevalentTaxa,
  Timescales,
} from "~/components/lex";

export function Page() {
  const { resData, colData, taxaData, refs } = useData();

  console.log("Lexicon Page Data", resData, colData, taxaData, refs);

  const id = resData.col_group_id;
  const features = colData?.features || [];
  const timescales = resData?.timescales || [];

  const children = [
    h(ColumnsTable, {
      resData,
      colData,
    }),
    h(Charts, { features }),
    h(PrevalentTaxa, { taxaData }),
    h(Timescales, { timescales }),
  ];

  return LexItemPage({ children, id, refs, resData, siftLink: "groups" });
}
