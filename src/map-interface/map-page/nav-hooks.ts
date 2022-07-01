import { useMatch, useLocation } from "react-router";
import classNames from "classnames";

export function usePanelOpen() {
  const match = useMatch("/");
  return match?.pathname != "/";
}

export function useContextClass() {
  const panelOpen = usePanelOpen();
  const pageName = useCurrentPage();
  if (!panelOpen) return null;
  return classNames("panel-open", pageName);
}

export function useCurrentPage() {
  const { pathname } = useLocation();
  return pathname.slice(pathname.lastIndexOf("/") + 1, pathname.length);
}
