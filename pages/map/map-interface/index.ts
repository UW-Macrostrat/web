import h from "@macrostrat/hyper";

import { startRecordingAppHistory, useAppActions } from "./app-state";
import MapPage from "./map-page";
import { browserHistory } from "./app-state";
import { isExternalHistoryChange } from "~/_utils/url-state";
import { useEffect, useLayoutEffect } from "react";

/** Redux is used only for the main map applicaton. This heavy state-management approach is
 * essentially a legacy approach, and we are moving away from this in favor of more lightweight
 * state management solutions that work on individual pages.
 */

export default function MapApp() {
  const runAction = useAppActions();
  // A layout effect, so it precedes MapPage's initial-load effect.
  useLayoutEffect(() => {
    resyncWithBrowserLocation(runAction);
  }, []);
  useEffect(() => {
    startRecordingAppHistory();
    return browserHistory.listen(({ action, location }) => {
      // Ignore history changes the app drove itself; respond only to external
      // ones (browser back/forward, or unmanaged programmatic navigation) by
      // reconstructing app state from the new URL.
      if (!isExternalHistoryChange(action, location)) return;
      runAction({ type: "set-location", location });
    });
  }, []);

  return h(MapPage);
}

/** Vike can load this module (and build the store and history from the URL)
 * before navigating here, as from a link on another page. */
function resyncWithBrowserLocation(runAction) {
  const { pathname, search, hash } = window.location;
  const known = browserHistory.location;
  if (known.pathname === pathname && known.search === search && known.hash === hash) return;
  browserHistory.replace({ pathname, search, hash });
  runAction({ type: "set-location", location: browserHistory.location });
}
