/**
 * The *target* half of the shared column-navigation map.
 *
 * `/columns` and `/columns/<id>` draw the same map — the same footprints, the
 * same interactions — but each used to mount its own Mapbox instance inside its
 * own page tree, so navigating between them tore down a GL context and built a
 * new one: style load, tile fetches and all. Instead there is now **one**
 * instance, mounted by `pages/columns/+Layout.ts` (which vike keeps alive across
 * navigation within `/columns`) and rendered into a single DOM node this module
 * owns. A page doesn't render a map; it renders a `ColumnMapSlot`, which
 *
 *  1. publishes what the map should show (`columnMapTargetAtom`), and
 *  2. moves the shared map node into itself.
 *
 * This is the same mechanism as the lexicon's persistent map
 * (`~/components/lex/map-target`) — see that module for why moving a DOM node
 * preserves the WebGL context, why the claim runs in a layout effect, and why
 * parking is deferred a frame.
 *
 * **Why a dedicated store.** The map is mounted *above* the pages, so it sits
 * outside the jotai `Provider` that `HybridPage` puts around each page's slots.
 * The same atom read on either side of a `Provider` is a different value cell,
 * so the two halves cannot talk through the ambient store. `columnMapStore` is
 * an explicit store both sides name, which sidesteps the nesting entirely.
 *
 * This module is deliberately **server-safe** (no mapbox import); the map tree
 * itself lives in `./persistent-map`, loaded client-only.
 */
import hyper from "@macrostrat/hyper";
import { atom, createStore, useAtomValue, useSetAtom } from "jotai";
import { useEffect, useLayoutEffect, useRef } from "react";

import styles from "./map-slot.module.sass";

const h = hyper.styled(styles);

export type MapBounds = [[number, number], [number, number]];

/** The one store the layout's map and the pages' slots share. */
export const columnMapStore = createStore();

export interface ColumnMapTarget {
  /** Identity of the view on screen. A change re-fits the map. */
  key: string;
  /** Project scope as the API takes it — numeric id(s), comma-joined, or null
   * for the default set. */
  projectID: string | number | null;
  /** Whether in-process columns are in scope. */
  inProcess: boolean;
  /** Restrict the drawn footprints to these column ids. `null` draws every
   * column in the project scope — what the column page wants, and what the list
   * falls back to when no list is mounted to agree with. */
  visibleColumnIDs: number[] | null;
  /** Columns drawn as selected (the list's multi-selection). */
  selectedColumnIDs: number[];
  /** The one column the page is about, for the library's own highlight. */
  selectedColumn: number | null;
  /** What a footprint click means on this page. */
  onSelectColumn: (colID: number | null) => void;
}

/**
 * What the shared map should be showing. Set by the mounted `ColumnMapSlot`.
 * Deliberately *not* cleared when a slot unmounts — the map keeps its last
 * target so navigation never blanks it.
 */
export const columnMapTargetAtom = atom<ColumnMapTarget | null>(null);

/** The map viewport, republished on every settled move. Read by the list's
 * "only in map area" filter. Flows map → page, the one channel that does. */
export const columnMapBoundsAtom = atom<MapBounds | null>(null);

/** The shared map's viewport, from inside a page's own jotai scope. */
export function useColumnMapBounds(): MapBounds | null {
  return useAtomValue(columnMapBoundsAtom, { store: columnMapStore });
}

let mapNode: HTMLDivElement | null = null;
let parkingNode: HTMLDivElement | null = null;
let parkHandle: number | null = null;

/** The one DOM node the map lives in, for the lifetime of the document. */
export function getColumnMapNode(): HTMLDivElement {
  if (mapNode == null) {
    mapNode = document.createElement("div");
    mapNode.className = "column-persistent-map";
    // Fills whichever slot claims it; the slot defines the definite height
    // that Mapbox needs.
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
    parkingNode.className = "column-map-parking";
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

/** Move the map out of an unmounting slot without destroying it — but only if
 * no other slot claims it first. During navigation the outgoing page's slot
 * unmounts and the incoming one mounts in the same tick, so the deferred park
 * is normally cancelled and the map simply changes parents.
 *
 * `from` is the mount the unmounting slot owned. If the node has since moved
 * somewhere else, another slot has claimed it and this park is stale — the
 * check matters when React mounts the incoming page *before* unmounting the
 * outgoing one, where cancelling alone would not save the claim. */
function parkColumnMapNodeSoon(from: HTMLElement | null) {
  cancelPendingPark();
  parkHandle = requestAnimationFrame(() => {
    parkHandle = null;
    if (mapNode == null) return;
    if (from != null && mapNode.parentElement !== from) return;
    getParkingNode().appendChild(mapNode);
  });
}

interface ColumnMapSlotProps extends Omit<ColumnMapTarget, "key"> {
  targetKey: string;
  className?: string;
  children?: any;
}

/**
 * Where the shared map should appear on this page. Renders an empty, definitely
 * sized box and moves the shared map node into it.
 */
export function ColumnMapSlot(props: ColumnMapSlotProps) {
  const {
    targetKey,
    projectID,
    inProcess,
    visibleColumnIDs,
    selectedColumnIDs,
    selectedColumn,
    onSelectColumn,
    className,
    children,
  } = props;
  const setTarget = useSetAtom(columnMapTargetAtom, { store: columnMapStore });
  const ref = useRef<HTMLDivElement | null>(null);

  // Both id lists are rebuilt on every render of the page body, so key the
  // update on their contents rather than their identity — otherwise the map
  // re-targets (and the list re-filters) on every keystroke in the search box.
  const visibleKey = visibleColumnIDs?.join(",") ?? null;
  const selectedKey = selectedColumnIDs.join(",");

  useEffect(() => {
    setTarget({
      key: targetKey,
      projectID,
      inProcess,
      visibleColumnIDs,
      selectedColumnIDs,
      selectedColumn,
      onSelectColumn,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- see *Key above
  }, [
    targetKey,
    projectID,
    inProcess,
    visibleKey,
    selectedKey,
    selectedColumn,
    onSelectColumn,
    setTarget,
  ]);

  // Layout effect, not a passive one: the node must be back in the document
  // before the browser paints the incoming page.
  useLayoutEffect(() => {
    cancelPendingPark();
    const mount = ref.current;
    mount?.appendChild(getColumnMapNode());
    return () => parkColumnMapNodeSoon(mount);
  }, []);

  return h("div.column-map-slot", { className }, [
    // Kept free of React children: the shared map node is appended here
    // imperatively, so React must not manage siblings inside it.
    h("div.map-mount", { ref }),
    children,
  ]);
}
