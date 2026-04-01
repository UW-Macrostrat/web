import h from "@macrostrat/hyper";

import "./searchbar.styl";

import { Provider } from "react-redux";
import { compose, createStore } from "redux";
import reducerStack, { AppAction, AppState } from "./app-state";
import MapPage from "./map-page";

/** Redux is used only for the main map applicaton. This heavy state-management approach is
 * essentially a legacy approach, and we are moving away from this in favor of more lightweight
 * state management solutions that work on individual pages.
 */

const composeEnhancers = window.__REDUX_DEVTOOLS_EXTENSION_COMPOSE__ || compose;

// Create the data store
let store = createStore<AppState, AppAction, any, any>(
  reducerStack,
  composeEnhancers()
);

export default function MapApp() {
  return h(Provider, { store }, h(MapPage));
}
