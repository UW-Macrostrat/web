import {
  AppState,
  AppAction,
  MenuPage,
} from "~/pages/map/map-interface/app-state";
import { push, UpdateLocationAction } from "@lagunovsky/redux-react-router";
import { LineString } from "geojson";
import { mapPagePrefix, routerBasename } from "@macrostrat-web/settings";
import { formatCoordForZoomLevel } from "@macrostrat/mapbox-utils";

export function pathNameAction(
  state: AppState
): UpdateLocationAction<"push"> | null {
  /** Set the pathname based on the current state. Only one of a location, cross-section line,
   * or active page can be selected at a time.
   * The following priority is applied:
   * 1. If a location is selected, show that location
   * 2. If a cross-section line is selected, set the cross-section path
   * 3. If an active page is selected, show that page
   */

  const pos = state.core.infoMarkerPosition;
  let nextPathname: string = state.router.location.pathname;
  if (pos != null) {
    const z = state.core.mapPosition.target?.zoom ?? 7;
    nextPathname = buildLocationPath(pos.lng, pos.lat, z);
    // TODO: we could probably assign column page based on a flag in the state
    if (state.router.location.pathname.endsWith("/column")) {
      nextPathname += "/column";
    }
  } else if (state.core.crossSectionLine != null) {
    nextPathname = buildCrossSectionPath(state.core.crossSectionLine);
  } else if (state.menu.activePage != null) {
    nextPathname = routeForActivePage(state.menu.activePage);
  } else {
    nextPathname = routerBasename;
  }
  if (nextPathname == state.router.location.pathname) {
    return null;
  }
  return push({ pathname: nextPathname, hash: state.router.location.hash });
}

function buildCrossSectionPath(line: LineString) {
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
