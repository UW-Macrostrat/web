import { useLocation, useNavigate } from "react-router";
import { useAppState } from "./hooks";
import classNames from "classnames";
import { MenuPage } from "./reducers";
import { routerBasename } from "../settings";

export function isDetailPanelRoute(pathname: string) {
  /* Some routes imply that the detail panel is open. This does not necessarily
  mean that the context panel will be closed when that panel is navigated to, but
  it takes the routing focus off the context panel's status. */
  return pathname.startsWith(routerBasename + "loc");
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
  return classNames("panel-open", activePage);
}

export function useCurrentPage() {
  const { pathname } = useLocation();
  return pathname.slice(pathname.lastIndexOf("/") + 1, pathname.length);
}

export function useHashNavigate(to: string) {
  const navigate = useNavigate();
  return () => {
    navigate(to + location.hash);
  };
}
