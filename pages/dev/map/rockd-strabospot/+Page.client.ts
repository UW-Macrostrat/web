/**
 * A development interface for rendering "Rockd Checkins".
 */

import h from "@macrostrat/hyper";
import { mapboxAccessToken } from "@macrostrat-web/settings";
import { DevMapPage } from "@macrostrat/map-interface";
import { useRockdStraboSpotStyle } from "./map-style";

export function Page() {
  const overlayStyle = useRockdStraboSpotStyle();

  return h(DevMapPage, {
    title: "Rockd + StraboSpot",
    overlayStyle,
    mapboxToken: mapboxAccessToken,
    // Start off showing the continental US, where there are lots of checkins
    bounds: [-125, 24, -66, 49],
  });
}
