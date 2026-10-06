/** URL-synced basemap state shared by the map pages that use `BaseLayerForm`.
 *
 * Every page reads the same `?basemap=` and `?labels=` params, so a choice
 * carries across links between them. Defaults stay out of the URL. */

import { removeMapLabels } from "@macrostrat/mapbox-utils";
import { atom, useAtomValue } from "jotai";
import { useCallback } from "react";

import { Basemap } from "~/components/map-controls";
import { atomWithSearchParam } from "./url-atoms";

const basemapParamAtom = atomWithSearchParam("basemap");

/** "basic" unless the URL asks for satellite: the only two `BaseLayerForm`
 * offers, so a hand-edited `none` can't leave a page without a base style. */
export const basemapAtom = atom(
  (get): Basemap => {
    if (get(basemapParamAtom) === Basemap.Satellite) return Basemap.Satellite;
    return Basemap.Basic;
  },
  (get, set, value: Basemap) => {
    let param: Basemap | null = value;
    if (value === Basemap.Basic) param = null;
    set(basemapParamAtom, param);
  }
);

const labelsParamAtom = atomWithSearchParam("labels");

/** Whether the basemap's text labels are shown. On by default. */
export const showLabelsAtom = atom(
  (get) => get(labelsParamAtom) !== "off",
  (get, set, value: boolean) => {
    let param: string | null = null;
    if (!value) param = "off";
    set(labelsParamAtom, param);
  }
);

/** A `MapView` `transformStyle` that strips the label layers when labels are
 * off. */
export function useLabelTransform() {
  const showLabels = useAtomValue(showLabelsAtom);

  return useCallback(
    (style) => {
      if (showLabels) return style;
      return removeMapLabels(style, true);
    },
    [showLabels]
  );
}
