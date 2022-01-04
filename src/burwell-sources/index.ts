import "babel-polyfill";

import { Provider } from "react-redux";
import thunkMiddleware from "redux-thunk";
import { createStore, applyMiddleware } from "redux";
import reducers from "./app-state";
import App from "./components/app";
import h from "@macrostrat/hyper";

// Create the data store
let store = createStore(reducers, applyMiddleware(thunkMiddleware));

// Render the application
export default function BurwellSources() {
  return h(Provider, { store }, [h(App)]);
}
