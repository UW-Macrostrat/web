import { mapPagePrefix, routerBasename } from "@macrostrat-web/settings";
import classNames from "classnames";
import { matchPath } from "react-router";
import { useAppState } from "./hooks";
import { AppState, MenuPage } from "./reducers/types";
import { createBrowserHistory } from "history";
import { useCallback } from "react";

export const browserHistory = createBrowserHistory();

function useLocation() {
  return browserHistory.location;
}

function useNavigate(spec) {
  return useCallback((path) => {
    return browserHistory.push(path);
  }, []);
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

export function setInfoMarkerPosition(
  state: AppState,
  pathname: string | null = null
): AppState {
  // Check if we are viewing a specific location
  const loc = matchPath(
    mapPagePrefix + "/loc/:lng/:lat/*",
    pathname ?? browserHistory.location.pathname
  );

  let s1 = state;

  if (loc != null) {
    const { lng, lat } = loc.params;
    return {
      ...s1,
      infoMarkerPosition: { lng: Number(lng), lat: Number(lat) },
      infoDrawerOpen: true,
    };
  }

  // Check if we're viewing a cross-section
  const crossSection = matchPath(
    mapPagePrefix + "/cross-section/:loc1/:loc2",
    pathname ?? browserHistory.location.pathname
  );
  if (crossSection != null) {
    const { loc1, loc2 } = crossSection.params;
    const [lng1, lat1] = loc1.split(",").map(Number);
    const [lng2, lat2] = loc2.split(",").map(Number);
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

  return state;
}
