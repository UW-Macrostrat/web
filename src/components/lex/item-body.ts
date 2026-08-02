import h from "@macrostrat/hyper";
import {
  ColumnsTable,
  Charts,
  PrevalentTaxa,
  Timescales,
  Units,
  Maps,
  Fossils,
  References,
} from "./index";
import {
  useLexColumns,
  useLexFossils,
  useLexTaxa,
  useLexUnits,
  useLexMaps,
  useLexRefs,
} from "./item-atoms";

interface LexItemBodyProps {
  type: string;
  id: number | string;
  resData: any;
  /** `#`-fragment query for the "show on map" control (empty → button hidden). */
  mapUrl?: string;
  /** Query string for the related-list links (units/maps/fossils). */
  relatedHref?: string;
  showUnits?: boolean;
  showMaps?: boolean;
  showFossils?: boolean;
  /** Server-agnostic extras rendered before/after the common block (e.g. the
   * interval age-scale, strat-name hierarchy, concept info). */
  topExtra?: any;
  bottomExtra?: any;
}

/**
 * The atom-driven "body" of a lexicon detail page — column table + map, charts,
 * prevalent taxa, timescales, and related-list links. Rendered **client-only**
 * (via `LexItemBodyClient`/`ClientOnly`) so the loadable atoms are read only in
 * the browser; the page's core (name, references) renders on the server. Per-type
 * differences come in as props so this stays generic. See [[Geologic lexicon pages]].
 */
export function LexItemBody(props: LexItemBodyProps) {
  const {
    type,
    id,
    resData,
    mapUrl,
    relatedHref,
    showUnits = true,
    showMaps = false,
    showFossils = true,
    topExtra = null,
    bottomExtra = null,
  } = props;

  const itemRef = { type, id: Number(id) };
  const colData = useLexColumns(itemRef);
  const fossilsData = useLexFossils(itemRef);
  const taxaData = useLexTaxa(itemRef);
  const unitsData = useLexUnits(itemRef);
  const mapsData = useLexMaps(itemRef);
  const refs = useLexRefs(itemRef);

  const features = colData?.features || [];
  const timescales = resData?.timescales || [];

  return h([
    topExtra,
    h(ColumnsTable, { resData, colData, fossilsData, mapUrl }),
    h(Charts, { features }),
    h(PrevalentTaxa, { taxaData }),
    h(Timescales, { timescales }),
    h.if(showUnits && unitsData?.length > 0)(Units, { href: relatedHref }),
    h.if(showMaps && mapsData?.length > 0)(Maps, { href: relatedHref }),
    h.if(showFossils && fossilsData?.features?.length > 0)(Fossils, {
      href: relatedHref,
    }),
    bottomExtra,
    h(References, { refs }),
  ]);
}
