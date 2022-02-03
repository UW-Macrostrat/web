import { Provider } from "react-redux";
import { createStore } from "redux";
import reducers from "./app-state";
import App from "./components/app";
import h from "@macrostrat/hyper";

// Create the data store
let store = createStore(reducers);

// Render the application
export default function BurwellSources() {
  return h(Provider, { store }, [h(App)]);
}
