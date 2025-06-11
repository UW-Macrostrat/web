import { Provider } from "react-redux";
import { createStore } from "redux";
import reducers from "./app-state";
import App from "./components/app";
import h from "@macrostrat/hyper";

// We should probably make this a little less global
// import "./searchbar.styl";
// import "./ui-components.styl";

// Create the data store
let store = createStore(reducers);

// Render the application
export function Page() {
  return h(Provider, { store }, [h(App)]);
}
