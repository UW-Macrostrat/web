import { useLocation, useNavigate } from "react-router";
import { useAppState } from "./hooks";
import classNames from "classnames";
import { MenuPage } from "./reducers";
import { routerBasename, mapPagePrefix } from "../settings";

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
  console.log("isDetailPanelRoute", pathname, routerBasename);
  return (
    pathname.startsWith(routerBasename + "/loc") ||
    pathname.startsWith(routerBasename + "/cross-section")
  );
}

export function contextPanelIsInitiallyOpen(pathname: string) {
  return pathname != routerBasename && !isDetailPanelRoute(pathname);
}

export function useContextPanelOpen() {
  return useAppState((s) => s.menu.activePage != null);
}

export function currentPageForPathName(pathname: string): MenuPage | null {
  return Object.values(MenuPage).find((page) =>
    pathname.startsWith(routerBasename + page)
  );
}

export function useContextClass() {
  const activePage = useAppState((s) => s.menu.activePage);
  if (activePage == null) return null;
  return classNames("map-context-open", activePage);
}

export function useCurrentPage() {
  const { pathname } = useLocation();
  return pathname.slice(pathname.lastIndexOf("/") + 1, pathname.length);
}

export function useHashNavigate(to: string) {
  const navigate = useNavigate();
  const location = useLocation();

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
