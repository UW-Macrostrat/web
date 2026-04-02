import h from "@macrostrat/hyper";

import "./searchbar.styl";

import { startRecordingAppHistory, useAppActions } from "./app-state";
import MapPage from "./map-page";
import type { Update } from "history";
import { browserHistory } from "./app-state";
import { useEffect } from "react";

/** Redux is used only for the main map applicaton. This heavy state-management approach is
 * essentially a legacy approach, and we are moving away from this in favor of more lightweight
 * state management solutions that work on individual pages.
 */

function isAppUpdate(event: Update) {
  const { action, location } = event;
  if (action == "POP") return false;
  if (location.state?.managed == true) return true;
  return false;
}

export default function MapApp() {
  const runAction = useAppActions();
  useEffect(() => {
    console.log("Starting app history recording");
    startRecordingAppHistory();
    browserHistory.listen((event) => {
      // Most location changes should be driven directly by the app.
      console.log(event);
      if (isAppUpdate(event)) return;
      const { location } = event;
      // Respond to unmanaged changes by updating app state to match new values
      runAction({ type: "set-location", location });
    });
  }, []);

  return h(MapPage);
}
