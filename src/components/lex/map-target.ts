/**
 * The *target* half of the unified lexicon map (Layer E — see
 * [[Geologic lexicon pages]]).
 *
 * A lexicon detail page used to mount its own Mapbox instance inside the page
 * body, so every client-side navigation between items tore down a GL context and
 * built a new one — style load, tile fetches and all. Instead there is now **one**
 * map instance, mounted by `pages/lex/+Layout.ts` (which vike keeps alive across
 * navigation within `/lex`) and rendered into a single DOM node that this module
 * owns. A page doesn't render a map; it renders a `LexMapSlot`, which
 *
 *  1. publishes what the map should show (`lexMapTargetAtom`), and
 *  2. moves the shared map node into itself.
 *
 * Moving a DOM node between parents preserves the WebGL context, so navigation
 * re-targets a warm map instead of recreating it. Two details make that
 * *visually* continuous rather than just cheap:
 *
 *  - the claim runs in a **layout** effect, so the node is back in the document
 *    before the browser paints the new page, and
 *  - parking (when a slot unmounts) is deferred a frame and cancelled if another
 *    slot claims the node first — so a navigation never paints a mapless gap.
 *
 * This module is deliberately **server-safe** (no mapbox import) because it is
 * reached from the lex barrel; the map tree itself lives in `./persistent-map`,
 * loaded client-only.
 */
import hyper from "@macrostrat/hyper";
import styles from "./map-slot.module.sass";
import { useEffect, useLayoutEffect, useRef } from "react";
import { AnchorButton, Spinner, Switch } from "@blueprintjs/core";
import { atom, useAtom, useSetAtom } from "jotai";
import classNames from "classnames";
import {
  MapSettingsBar,
  MapSettingsOverlay,
  mapSettingsStore,
} from "~/components/map-settings";

const h = hyper.styled(styles);

export interface LexMapTarget {
  /** Identity of the item on screen (`type:id`). A change re-fits the map. */
  key: string;
  /** Column footprints (GeoJSON FeatureCollection). */
  columns: any;
  /** Fossil collections (GeoJSON FeatureCollection), possibly empty. */
  fossilsData: any;
  /** Outcrop-overlay filters for this item. */
  filters: any[];
  /** `#`-fragment query for the "show on map" control (empty → hidden). */
  mapUrl: string;
}

/**
 * What the shared map should be showing, in `mapSettingsStore`. Set by the
 * mounted `LexMapSlot`; read by the persistent map in the layout. It is
 * deliberately *not* cleared when a slot
 * unmounts, nor while the next item's columns are loading — the map keeps its
 * last target (dimmed, under a loading overlay) so navigation never blanks it.
 */
export const lexMapTargetAtom = atom<LexMapTarget | null>(null);

/** The lexicon map's optional layers, toggled from the settings bar beneath the
 * map. Lives in the shared `mapSettingsStore` alongside the basemap. Kept on
 * across items; the map ignores a toggle the current item can't honor. */
export const lexMapLayersAtom = atom({ fossils: true, outcrop: false });

/** The shared settings bar, plus the outcrop toggle and a link to the item on
 * the main map. Rendered beneath the map by the page, whichever map instance
 * (shared or local) is above it. The fossils toggle is in the Fossils card. */
export function LexMapSettingsBar({
  mapUrl,
  hasFilters,
}: {
  mapUrl: string;
  hasFilters: boolean;
}) {
  const [layers, setLayers] = useAtom(lexMapLayersAtom, {
    store: mapSettingsStore,
  });

  let outcropToggle = null;
  if (hasFilters) {
    outcropToggle = h(Switch, {
      label: "Mapped outcrop",
      checked: layers.outcrop,
      onChange: (e) => setLayers({ ...layers, outcrop: e.currentTarget.checked }),
    });
  }

  let settings = null;
  if (outcropToggle != null) {
    settings = [outcropToggle];
  }

  let mapLink = null;
  if (mapUrl !== "") {
    mapLink = h(AnchorButton, {
      href: "/map/layers#" + mapUrl,
      icon: "map",
      text: "View on map",
      minimal: true,
      small: true,
    });
  }

  return h(MapSettingsBar, { settings }, mapLink);
}

/** The settings as a gear over the map, with the outcrop toggle among them */
export function LexMapSettingsOverlay({ hasFilters }: { hasFilters: boolean }) {
  const [layers, setLayers] = useAtom(lexMapLayersAtom, {
    store: mapSettingsStore,
  });
  let outcropToggle = null;
  if (hasFilters) {
    outcropToggle = h(Switch, {
      label: "Mapped outcrop",
      checked: layers.outcrop,
      onChange: (e) =>
        setLayers({ ...layers, outcrop: e.currentTarget.checked }),
    });
  }
  return h(MapSettingsOverlay, { settings: outcropToggle });
}

let mapNode: HTMLDivElement | null = null;
let parkingNode: HTMLDivElement | null = null;
let parkHandle: number | null = null;

/** The one DOM node the map lives in, for the lifetime of the document. */
export function getLexMapNode(): HTMLDivElement {
  if (mapNode == null) {
    mapNode = document.createElement("div");
    mapNode.className = "lex-persistent-map";
    // Fills whichever slot claims it; the slot defines the definite height that
    // Mapbox needs.
    mapNode.style.width = "100%";
    mapNode.style.height = "100%";
  }
  return mapNode;
}

/** Hidden holder that keeps the map node (and its GL context) attached to the
 * document while no page slot is claiming it. */
function getParkingNode(): HTMLDivElement {
  if (parkingNode == null) {
    parkingNode = document.createElement("div");
    parkingNode.className = "lex-map-parking";
    parkingNode.style.display = "none";
    document.body.appendChild(parkingNode);
  }
  return parkingNode;
}

function cancelPendingPark() {
  if (parkHandle == null) return;
  cancelAnimationFrame(parkHandle);
  parkHandle = null;
}

/** Move the map out of an unmounting slot without destroying it — but only if no
 * other slot claims it first. During navigation the outgoing page's slot unmounts
 * and the incoming one mounts in the same tick, so the deferred park is normally
 * cancelled and the map simply changes parents. */
function parkLexMapNodeSoon() {
  cancelPendingPark();
  parkHandle = requestAnimationFrame(() => {
    parkHandle = null;
    if (mapNode == null) return;
    getParkingNode().appendChild(mapNode);
  });
}

interface LexMapSlotProps extends Omit<LexMapTarget, "key"> {
  targetKey: string;
  /** Columns are still loading: hold the previous target and dim the map rather
   * than dropping it (which is what made the map flash on navigation). */
  loading?: boolean;
  /** Fill a container of definite height instead of taking a fixed one */
  fill?: boolean;
  className?: string;
}

/**
 * Where the shared map should appear on this page. Renders an empty, definitely
 * sized box and moves the shared map node into it.
 */
export function LexMapSlot(props: LexMapSlotProps) {
  const {
    targetKey,
    columns,
    fossilsData,
    filters,
    mapUrl,
    loading = false,
    fill = false,
    className,
  } = props;
  // The shared store, so a slot inside another jotai scope (the hybrid frame's)
  // still reaches the map, which the layout mounts outside it
  const setTarget = useSetAtom(lexMapTargetAtom, { store: mapSettingsStore });
  const ref = useRef<HTMLDivElement | null>(null);

  // `filters` is rebuilt on every render of the page body, so key the update on
  // its contents rather than its identity.
  const filterKey = filters.map((f) => `${f.type}:${f.id}`).join(",");
  const hasColumns = columns?.features?.length > 0;

  useEffect(() => {
    if (!hasColumns) return;
    setTarget({ key: targetKey, columns, fossilsData, filters, mapUrl });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- see filterKey
  }, [
    targetKey,
    hasColumns,
    columns,
    fossilsData,
    mapUrl,
    filterKey,
    setTarget,
  ]);

  // Layout effect, not a passive one: the node must be back in the document
  // before the browser paints the incoming page.
  useLayoutEffect(() => {
    cancelPendingPark();
    ref.current?.appendChild(getLexMapNode());
    return parkLexMapNodeSoon;
  }, []);

  let overlay = null;
  if (loading) {
    overlay = h("div.map-loading-overlay", h(Spinner));
  }

  return h("div.lex-map-slot", { className: classNames(className, { fill }) }, [
    // Kept free of React children: the shared map node is appended here
    // imperatively, so React must not manage siblings inside it.
    h("div.map-mount", { ref }),
    overlay,
  ]);
}
