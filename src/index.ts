import "babel-polyfill";
import "@blueprintjs/core/lib/css/blueprint.css";
import "./styles/padding.css";

import { FocusStyleManager } from "@blueprintjs/core";
import h from "@macrostrat/hyper";

FocusStyleManager.onlyShowFocusOnTabs();

import { render } from "react-dom";
import { Provider } from "react-redux";
import { createStore, compose } from "redux";
import reducerStack, { Action } from "./map-interface/app-state";
import App from "./app";

const composeEnhancers = window.__REDUX_DEVTOOLS_EXTENSION_COMPOSE__ || compose;

type AppState = any;

// Create the data store
let store = createStore<AppState, Action, any, any>(
  reducerStack,
  composeEnhancers()
);

// Render the application
render(
  h(Provider, { store }, h(App)),
  document.getElementById("app-container")
);
