import h from "@macrostrat/hyper";

import "./searchbar.styl";

import { Provider } from "react-redux";
import { compose, createStore } from "redux";
import reducerStack, { AppAction, AppState } from "./app-state";
import MapPage from "./map-page";
import type { Update } from "history";
import { browserHistory } from "./app-state";

/** Redux is used only for the main map applicaton. This heavy state-management approach is
 * essentially a legacy approach, and we are moving away from this in favor of more lightweight
 * state management solutions that work on individual pages.
 */

const composeEnhancers = window.__REDUX_DEVTOOLS_EXTENSION_COMPOSE__ || compose;

// Create the data store
const store = createStore<AppState, AppAction, any, any>(
  reducerStack,
  composeEnhancers()
);

function isAppUpdate(event: Update) {
  const { action, location } = event;
  if (action == "POP") return false;
  if (location.state?.managed == true) return true;
  return false;
}

browserHistory.listen((event) => {
  // Most location changes should be driven directly by the app.
  if (isAppUpdate(event)) return;
  const { location } = event;
  // Respond to unmanaged changes by updating app state to match new values
  store.dispatch({ type: "set-location", location });
});

export default function MapApp() {
  return h(Provider, { store }, h(MapPage));
}
