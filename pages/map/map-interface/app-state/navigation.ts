import { mapPagePrefix, routerBasename } from "@macrostrat-web/settings";
import classNames from "classnames";
import { useAppState } from "./store.ts";
import { AppState, MenuPage } from "./types";
import { type To, type Location } from "history";
import { useCallback } from "react";
import h from "@macrostrat/hyper";
import { getInitialStateFromHash } from "./hash-string";
import { atom, useAtomValue } from "jotai";
import partRegex from "part-regex";
import { browserHistory } from "./browser-history";

// This sometimes gets called when the page isn't properly loaded yet,
// so we have put in place a hacky guard...
// We should do this within the component tree

export function startRecordingAppHistory() {
  browserHistory.replace(
    {
      pathname: window.location.pathname,
      hash: window.location.hash,
    },
    { managed: true }
  );
}

const historyAtom = atom(browserHistory);

export const useHistory = () => useAtomValue(historyAtom);

export function useLocation() {
  return useHistory().location;
}

export function useNavigate() {
  const history = useHistory();
  return useCallback((req: To) => {
    return history.push(req);
  }, []);
}

export function Link({ to, ...rest }: { to: To; children: React.ReactNode }) {
  let href = null;
  if (to != null) {
    href = browserHistory.createHref(to);
  }
  return h("a", { href, ...rest });
}

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

export function useContextPanelOpen() {
  return useAppState((s) => s.activeMenuPage != null);
}

export function currentPageForPathName(pathname: string): MenuPage | null {
  return Object.values(MenuPage).find((page) =>
    pathname.startsWith(routerBasename + "/" + page)
  );
}

export function useContextClass() {
  const activePage = useAppState((s) => s.activeMenuPage);
  if (activePage == null) return null;
  return classNames("map-context-open", activePage);
}

export function useCurrentPage(baseRoute = "/") {
  const { pathname } = useLocation();
  return pathname.slice(baseRoute.length);
}

export function useHashNavigate(to: string) {
  const navigate = useNavigate();
  const location = useLocation();

  if (navigate == null || location == null) {
    return null;
  }

  return () => {
    // This may be needed because of module/context stuff
    // Compute relative path if necessary
    if (to.startsWith(".")) {
      // Do our own relative path calculations
      let currentPath = location.pathname;
      if (!currentPath.endsWith("/")) {
        currentPath += "/";
      }
      to = currentPath + to;
    }
    navigate({
      pathname: to,
      hash: location.hash,
    });
  };
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
