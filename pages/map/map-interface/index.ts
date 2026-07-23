import h from "@macrostrat/hyper";

import "./searchbar.styl";

import { startRecordingAppHistory, useAppActions } from "./app-state";
import MapPage from "./map-page";
import { browserHistory } from "./app-state";
import { isExternalHistoryChange } from "~/_utils/url-state";
import { useEffect } from "react";

/** Redux is used only for the main map applicaton. This heavy state-management approach is
 * essentially a legacy approach, and we are moving away from this in favor of more lightweight
 * state management solutions that work on individual pages.
 */

export default function MapApp() {
  const runAction = useAppActions();
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
