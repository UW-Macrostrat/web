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
import {
  useLexColumns,
  useLexFossils,
  useLexTaxa,
  useLexUnits,
} from "~/components/lex/item-atoms";
import { usePageContext } from "vike-react/usePageContext";

export function Page() {
  const { resData, refs } = useData();
  const id = usePageContext().routeParams.id;

  const itemRef = { type: "economics", id: Number(id) };
  const colData = useLexColumns(itemRef);
  const fossilsData = useLexFossils(itemRef);
  const taxaData = useLexTaxa(itemRef);
  const unitsData = useLexUnits(itemRef);

  const features = colData?.features || [];
  const timescales = resData?.timescales || [];
  const relatedHref =
    "econ_id=" + id + "&color=" + resData?.color + "&name=" + resData?.name;

  return h(LexItemPage, { id, refs, resData, siftLink: "economic" }, [
    h(ColumnsTable, { resData, colData, fossilsData }),
    h(Charts, { features }),
    h(PrevalentTaxa, { taxaData }),
    h(Timescales, { timescales }),
    h.if(fossilsData?.features?.length > 0)(Fossils, { href: relatedHref }),
    h.if(unitsData?.length > 0)(Units, { href: relatedHref }),
  ]);
}
