import { useData } from "vike-react/useData";
import { LexItemPage } from "~/components/lex";
import h from "@macrostrat/hyper"
import { ColumnsTable, Charts, PrevalentTaxa, Timescales } from "~/components/lex";

export function Page() {
  const { resData, colData, taxaData, refs } = useData();

  const id = resData.econ_id;
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
  ]

  return LexItemPage({children, id, refs, resData, siftLink: "economic"});
}
