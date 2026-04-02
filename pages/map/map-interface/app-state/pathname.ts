import { AppState, MenuPage } from "./types";
import { LineString } from "geojson";
import { mapPagePrefix, routerBasename } from "@macrostrat-web/settings";
import { formatCoordForZoomLevel } from "@macrostrat/mapbox-utils";

export function buildPathName(state: AppState): string | null {
  /** Set the pathname based on the current state. Only one of a location, cross-section line,
   * or active page can be selected at a time.
   * The following priority is applied:
   * 1. If a location is selected, set the path to that location
   *   - add /column suffix if needed
   * 2. If a cross-section line is selected, set the cross-section path
   * 3. If an active page is selected, show that page
   */

  const pos = state.infoMarkerPosition;
  let nextPathname: string = routerBasename;
  if (pos != null) {
    const z = state.mapPosition.target?.zoom ?? 7;
    nextPathname = buildLocationPath(pos.lng, pos.lat, z);
    // TODO: we could probably assign column page based on a flag in the state
    if (state.isShowingColumnPage) {
      nextPathname += "/column";
    }
  } else if (state.crossSectionLine != null) {
    nextPathname = buildCrossSectionPath(state.crossSectionLine);
  } else if (state.activeMenuPage != null) {
    nextPathname = routeForActivePage(state.activeMenuPage);
  }
  return nextPathname;
}

export function buildCrossSectionPath(line: LineString) {
  const pts = line.coordinates
    .map((p) => `${p[0].toFixed(4)},${p[1].toFixed(4)}`)
    .join("/");

  return mapPagePrefix + "/cross-section/" + pts;
}

export function buildLocationPath(lng: number, lat: number, z: number) {
  const ln = formatCoordForZoomLevel(lng, Number(z));
  const lt = formatCoordForZoomLevel(lat, Number(z));
  return mapPagePrefix + `/loc/${ln}/${lt}`;
}

function routeForActivePage(page: MenuPage) {
  let newPathname = routerBasename;
  if (page != null) {
    newPathname += "/" + page;
  }
  return newPathname;
}
