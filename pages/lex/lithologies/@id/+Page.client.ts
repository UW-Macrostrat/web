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
  Maps,
  TextExtractions
} from "~/components/lex";
import { usePageContext } from "vike-react/usePageContext";

export function Page() {
  const { resData, colData, taxaData, refs, fossilsData, mapsData, unitsData } =
    useData();

  const id = usePageContext().urlParsed.pathname.split("/")[3];
  const features = colData?.features || [];
  const timescales = resData?.timescales || [];

  console.log("fossil Data:", fossilsData);

  const children = [
    h(ColumnsTable, {
      resData,
      colData,
      fossilsData
    }),
    h(Charts, { features }),
    h(PrevalentTaxa, { taxaData }),
    h(Timescales, { timescales }),
    h(Maps, { mapsData }),
    h(TextExtractions, { lith_id: id, href: "autoselect=" + resData?.name + "&lith_id=" + id + "&color=" + resData?.color }),
    h.if(fossilsData.features.length > 0)(Fossils, { href: "lith_id=" + id + "&color=" + resData?.color + "&name=" + resData?.name }),
    h.if(unitsData.length > 0)(Units, { href: "lith_id=" + id + "&color=" + resData?.color + "&name=" + resData?.name }),
  ];

  return LexItemPage({ children, id, refs, resData, siftLink: "lithology" });
}