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
} from "~/components/lex";
import {
  useLexColumns,
  useLexFossils,
  useLexTaxa,
  useLexUnits,
  useLexMaps,
} from "~/components/lex/item-atoms";
import { usePageContext } from "vike-react/usePageContext";

export function Page() {
  const { resData, refs } = useData();
  const id = usePageContext().routeParams.id;

  // Heavy/derived data loads client-side via loadable atoms (null while
  // loading); the descriptive core comes from the server +data above.
  const itemRef = { type: "lithologies", id: Number(id) };
  const colData = useLexColumns(itemRef);
  const fossilsData = useLexFossils(itemRef);
  const taxaData = useLexTaxa(itemRef);
  const unitsData = useLexUnits(itemRef);
  const mapsData = useLexMaps(itemRef);

  const features = colData?.features || [];
  const timescales = resData?.timescales || [];

  const relatedHref =
    "lith_id=" + id + "&color=" + resData?.color + "&name=" + resData?.name;

  return h(LexItemPage, { id, refs, resData, siftLink: "lithology" }, [
    h(ColumnsTable, {
      resData,
      colData,
      fossilsData,
      mapUrl: "lithologies=" + id,
    }),
    h(Charts, { features }),
    h(PrevalentTaxa, { taxaData }),
    h(Timescales, { timescales }),
    h.if(unitsData?.length > 0)(Units, { href: relatedHref }),
    h.if(mapsData?.length > 0)(Maps, { href: relatedHref }),
    h.if(fossilsData?.features?.length > 0)(Fossils, { href: relatedHref }),
  ]);
}
