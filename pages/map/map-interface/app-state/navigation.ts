import classNames from "classnames";
import { useAppState } from "./store.ts";
import { type To } from "history";
import { useCallback } from "react";
import h from "@macrostrat/hyper";
import { atom, useAtomValue } from "jotai";
import { browserHistory } from "./browser-history";

// Pure URL/location → state helpers moved to ./location-state (kept off this
// module so the store's eager init path never re-enters navigation — see the
// note there). Re-export them so existing consumers of this module keep working.
export * from "./location-state";

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

export function useContextPanelOpen() {
  return useAppState((s) => s.activeMenuPage != null);
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
