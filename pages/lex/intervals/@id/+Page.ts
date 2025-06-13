import { useData } from "vike-react/useData";
import h from "@macrostrat/hyper";
import {
  Intervals,
  LexItemPage,
  ColumnsTable,
  Charts,
  PrevalentTaxa,
  Timescales,
  Units,
} from "~/components/lex";

export function Page() {
  const { resData, colData, taxaData, refs, unitsData } = useData();

  const id = resData.int_id;
  const features = colData?.features || [];
  const timescales = resData?.timescales || [];

  const children = [
    h(Intervals, { resData }),
    h(ColumnsTable, {
      resData,
      colData,
    }),
    h(Charts, { features }),
    h(PrevalentTaxa, { taxaData }),
    h(Timescales, { timescales }),
    h(Units, { unitsData })
  ];

  return LexItemPage({ children, id, refs, resData, siftLink: "interval" });
}
