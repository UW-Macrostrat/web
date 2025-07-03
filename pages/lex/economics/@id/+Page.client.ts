import { useData } from "vike-react/useData";
import h from "@macrostrat/hyper";
import {
  LexItemPage,
  ColumnsTable,
  Charts,
  PrevalentTaxa,
  Timescales,
  Units,
  Fossils,
} from "~/components/lex";

export function Page() {
  const { resData, colData, taxaData, refs, unitsData, fossilsData } =
    useData();

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
    h(Units, { unitsData }),
    h(Fossils, { fossilsData }),
  ];

  return LexItemPage({ children, id, refs, resData, siftLink: "economic" });
}
