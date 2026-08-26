import { mapPagePrefix, routerBasename } from "@macrostrat-web/settings";
import { type Location } from "history";
import partRegex from "part-regex";
import { AppState, MenuPage } from "./types";
import { getInitialStateFromHash } from "./hash-string";
import { browserHistory } from "./browser-history";

/**
 * Pure URL/location → app-state helpers.
 *
 * These live in their own leaf module (no `store` / `navigation` / React
 * imports) on purpose. `reducer.ts` builds the store's initial state eagerly at
 * module load (`store.ts` → `createStore` → `createInitialState` →
 * `updateStateFromLocation`), and when that ran through `navigation.ts` it could
 * fire while `navigation.ts` was suspended mid-import — hitting the temporal
 * dead zone of module-level consts like `locationPageURL`
 * ("can't access lexical declaration '…' before initialization").
 *
 * `reducer.ts` and `map-url-adapter.ts` import `updateStateFromLocation` from
 * here, so the init path never re-enters `navigation.ts` and the
 * navigation ⇄ store ⇄ reducer cycle is broken.
 */

export function updateStateFromLocation(
  baseState: AppState,
  location?: Pick<Location, "pathname" | "hash"> | null
): AppState {
  const { pathname, hash } = location ?? browserHistory.location;
  const isOpen = contextPanelIsInitiallyOpen(pathname);
  const activeMenuPage = currentPageForPathName(pathname);
  const s1 = setInfoMarkerPosition(baseState, pathname);
  const [coreState, filters] = getInitialStateFromHash(s1, hash);

  let isShowingColumnPage = false;
  if (activeMenuPage == null && pathname.endsWith("/column")) {
    isShowingColumnPage = true;
  }

  return {
    ...s1,
    ...coreState,
    filtersInfo: filters,
    menuOpen: isOpen,
    contextPanelOpen: isOpen,
    isShowingColumnPage,
    activeMenuPage,
  };
}

export function isDetailPanelRouteInternal(pathname: string) {
  /* Check if we're in a detail panel route from within the app. */
  return (
    pathname.startsWith(mapPagePrefix + "/loc") ||
    pathname.startsWith(mapPagePrefix + "/cross-section")
  );
}

export function isDetailPanelRoute(pathname: string) {
  /* Some routes imply that the detail panel is open. This does not necessarily
  mean that the context panel will be closed when that panel is navigated to, but
  it takes the routing focus off the context panel's status. */
  // Hack: cover all our bases here by not differentiating between paths that start with
  // routerBasename (i.e. full location paths) vs. react-router internal paths.
  return (
    pathname.startsWith(routerBasename + "/loc") ||
    pathname.startsWith(routerBasename + "/cross-section")
  );
}

export function contextPanelIsInitiallyOpen(pathname: string) {
  return pathname != routerBasename && !isDetailPanelRoute(pathname);
}

export function currentPageForPathName(pathname: string): MenuPage | null {
  return Object.values(MenuPage).find((page) =>
    pathname.startsWith(routerBasename + "/" + page)
  );
}

// Regex for one part of a spatial coordinate
const coordRegex = /(-?\d+(?:\.\d+)?)/;

const crossSectionPageURL = partRegex`${mapPagePrefix}/cross-section/${coordRegex},${coordRegex}/${coordRegex},${coordRegex}`;

const locationPageURL = partRegex`${mapPagePrefix}/loc/${coordRegex}/${coordRegex}`;

export function setInfoMarkerPosition(
  state: AppState,
  pathname: string | null = null
): AppState {
  // Check if we are viewing a specific location
  const match = locationPageURL.exec(
    pathname ?? browserHistory.location.pathname
  );

  let s1 = state;

  if (match != null) {
    const [_, lng, lat] = match;
    return {
      ...s1,
      infoMarkerPosition: {
        lng: Number(lng),
        lat: Number(lat),
        // The loc path doesn't encode zoom; carry the current map zoom so the
        // shape matches `start-map-query` and the map-data query has a zoom.
        zoom: s1.mapPosition?.target?.zoom,
      },
      infoDrawerOpen: true,
    };
  }

  const crossSectionMatch = crossSectionPageURL.exec(
    pathname ?? browserHistory.location.pathname
  );

  // Check if we're viewing a cross-section

  if (crossSectionMatch != null) {
    const [_, ...coords] = crossSectionMatch;
    const coordsNumeric = coords.map(Number);
    const [lng1, lat1, lng2, lat2] = coordsNumeric;
    if (lng1 != null && lat1 != null && lng2 != null && lat2 != null) {
      return {
        ...s1,
        crossSectionLine: {
          type: "LineString",
          coordinates: [
            [lng1, lat1],
            [lng2, lat2],
          ],
        },
      };
    }
  }

  // The URL is a plain map route with no location or cross-section. Clear any
  // stale detail-panel state so that back/forward navigation away from a
  // /loc or /cross-section route actually closes the info drawer.
  return {
    ...s1,
    infoMarkerPosition: null,
    infoDrawerOpen: false,
    crossSectionLine: null,
  };
}
