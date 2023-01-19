import { useMatch, useLocation, useNavigate } from "react-router";
import classNames from "classnames";

export function contextPanelIsOpen(pathname: string) {
  return pathname != "/" && !pathname.startsWith("/position");
}

export function usePanelOpen() {
  const { pathname } = useLocation();
  return contextPanelIsOpen(pathname);
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

export function useHashNavigate(to: string) {
  const navigate = useNavigate();
  return () => {
    navigate(to + location.hash);
  };
}
