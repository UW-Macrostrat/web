/**
 * A development interface for rendering "Rockd Checkins".
 */

import h from "@macrostrat/hyper";

import { mapboxAccessToken, tileserverDomain } from "@macrostrat-web/settings";
import { DevMapPage } from "@macrostrat/map-interface";
import { buildMacrostratStyle } from "@macrostrat/mapbox-styles";
import { mergeStyles } from "@macrostrat/mapbox-utils";
import mapboxgl from "mapbox-gl";
import { useInDarkMode } from "@macrostrat/ui-components";
import { useMemo } from "react";
import { buildCheckinStyle } from "./map-style";

export function Page() {
  const inDarkMode = useInDarkMode();
  const style = useMemo(() => {
    return mergeStyles(_macrostratStyle, buildCheckinStyle(inDarkMode));
  }, [inDarkMode]);

  return h(DevMapPage, {
    title: "Rockd + StraboSpot",
    overlayStyle: style,
    mapboxToken: mapboxAccessToken,
    // Start off showing the continental US, where there are lots of checkins
    bounds: [-125, 24, -66, 49],
  });
}

const _macrostratStyle = buildMacrostratStyle({
  tileserverDomain: tileserverDomain,
  fillOpacity: 0.2,
  strokeOpacity: 0.1,
}) as mapboxgl.Style;
