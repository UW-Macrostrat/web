import "babel-polyfill";
import "@blueprintjs/core/lib/css/blueprint.css";
//https://material-ui.com/style/typography/#migration-to-typography-v2
window.__MUI_USE_NEXT_TYPOGRAPHY_VARIANTS__ = true;
import { FocusStyleManager } from "@blueprintjs/core";
import h from "@macrostrat/hyper";

FocusStyleManager.onlyShowFocusOnTabs();

import React from "react";
import { render } from "react-dom";
import { Provider } from "react-redux";
import thunkMiddleware from "redux-thunk";
import { createStore, applyMiddleware, compose } from "redux";
import reducers from "./map-interface/reducers";
import { getInitialMapState } from "./map-interface/actions";
import App from "./app";

const composeEnhancers = window.__REDUX_DEVTOOLS_EXTENSION_COMPOSE__ || compose;

// Create the data store
let store = createStore(
  reducers,
  composeEnhancers(applyMiddleware(thunkMiddleware))
);

// Parse the URI on load
store.dispatch(getInitialMapState());

// Render the application
render(h(Provider, { store }, h(App)), document.getElementById("react"));
