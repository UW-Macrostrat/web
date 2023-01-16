import { useMatch, useLocation, useNavigate } from "react-router";
import classNames from "classnames";
import { useAppState } from "./hooks";

export function usePanelOpen() {
  return useAppState((s) => s.core.contextPanelOpen);
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
