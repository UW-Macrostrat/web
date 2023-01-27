import { useMatch, useLocation, useNavigate } from "react-router";
import { useAppState } from "./hooks";
import classNames from "classnames";

export function isDetailPanelRoute(pathname: string) {
  /* Some routes imply that the detail panel is open. This does not necessarily
  mean that the context panel will be closed when that panel is navigated to, but
  it takes the routing focus off the context panel's status. */
  return pathname.startsWith("/pos");
}

export function contextPanelIsInitiallyOpen(pathname: string) {
  return pathname != "/" && !isDetailPanelRoute(pathname);
}

export function useContextPanelOpen() {
  const { pathname } = useLocation();
  // If we are at the root path, the context panel is never open
  if (pathname == "/") return false;

  return contextPanelIsInitiallyOpen(pathname);
}

export function useContextClass() {
  const panelOpen = useContextPanelOpen();
  const pageName = useCurrentPage();
  if (!panelOpen) return null;
  return classNames("panel-open", pageName);
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
