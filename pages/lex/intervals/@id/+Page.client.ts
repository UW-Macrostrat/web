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
  Fossils,
} from "~/components/lex";
import { usePageContext } from "vike-react/usePageContext";

export function Page() {
  const { resData, colData, taxaData, refs, fossilsData, unitsData } =
    useData();

  const id = usePageContext().urlParsed.pathname.split("/")[3];
  const features = colData?.features || [];
  const timescales = resData?.timescales || [];

  const children = [
    h(Intervals, { resData }),
    h(ColumnsTable, {
      resData,
      colData,
      fossilsData,
      mapUrl: "intervals=" + id
    }),
    h(Charts, { features }),
    h(PrevalentTaxa, { taxaData }),
    h(Timescales, { timescales }),
    h.if(fossilsData.features.length > 0)(Fossils, { href: "int_id=" + id + "&color=" + resData?.color + "&name=" + resData?.name }),
    h.if(unitsData.length > 0)(Units, { href: "int_id=" + id + "&color=" + resData?.color + "&name=" + resData?.name }),
  ];

  return LexItemPage({ children, id, refs, resData, siftLink: "interval" });
}
