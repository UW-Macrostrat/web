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
  useLexColumnsState,
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
  // The columns' *load state* matters here, not just the data: the column block
  // reserves its space (keeping the shared map in place) while they load.
  const { data: colData, loading: columnsLoading } =
    useLexColumnsState(itemRef);
  const fossilsData = useLexFossils(itemRef);
  const taxaData = useLexTaxa(itemRef);
  // Paused with the beta cards below — these are their only consumers, and with
  // the cards hidden they'd be two fetches per item for nothing.
  // const unitsData = useLexUnits(itemRef);
  // const mapsData = useLexMaps(itemRef);
  const refs = useLexRefs(itemRef);

  const features = colData?.features || [];
  const timescales = resData?.timescales || [];

  return h([
    topExtra,
    // `targetKey` identifies this item to the shared (layout-owned) map, which
    // re-targets rather than remounting as the user navigates between items.
    h(ColumnsTable, {
      resData,
      colData,
      fossilsData,
      mapUrl,
      targetKey: `${type}:${id}`,
      loading: columnsLoading,
    }),
    h(Charts, { features }),
    h(PrevalentTaxa, { taxaData }),
    // The beta "Columns" / "Map Legends" / "Fossils" cards are held back for now
    // (per Daven) — the pages they link to aren't ready to show. Kept here rather
    // than deleted, along with the `showUnits`/`showMaps`/`showFossils` props and
    // the atoms that feed them, so restoring them is uncommenting three lines.
    //
    // h.if(showUnits && unitsData?.length > 0)(Units, { href: relatedHref }),
    // h.if(showMaps && mapsData?.length > 0)(Maps, { href: relatedHref }),
    // h.if(showFossils && fossilsData?.features?.length > 0)(Fossils, {
    //   href: relatedHref,
    // }),
    bottomExtra,
    h(References, { refs }),
  ]);
}
