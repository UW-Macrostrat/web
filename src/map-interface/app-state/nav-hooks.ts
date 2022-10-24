import { useMatch, useLocation, useNavigate } from "react-router";
import classNames from "classnames";

export function usePanelOpen(baseRoute="/") {
  const match = useMatch(baseRoute);
  return match?.pathname != baseRoute;
}

export function useContextClass(baseRoute) {
  const panelOpen = usePanelOpen(baseRoute);
  const pageName = useCurrentPage(baseRoute);
  if (!panelOpen) return null;
  return classNames("panel-open", pageName);
}

export function useCurrentPage(baseRoute = "/") {
  const { pathname } = useLocation();
  return pathname.slice(pathname.lastIndexOf(baseRoute) + 1, pathname.length);
}

export function useHashNavigate(to: string) {
  const navigate = useNavigate();
  return () => {
    navigate(to + location.hash);
  };
}
