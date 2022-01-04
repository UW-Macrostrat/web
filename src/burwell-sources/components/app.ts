import { useEffect } from "react";
import Content from "./content";
import { useBurwellActions } from "~/burwell-sources/app-state";
import h from "@macrostrat/hyper";
// // Needed for onTouchTap
// import injectTapEventPlugin from 'react-tap-event-plugin'
// // http://stackoverflow.com/a/34015469/988941
// injectTapEventPlugin()

import MuiThemeProvider from "material-ui/styles/MuiThemeProvider";

// Import other components

function App() {
  const runAction = useBurwellActions();
  useEffect(() => {
    // Fetch the data on load
    runAction({ type: "request-data" });
    runAction({ type: "fetch-data" });
  }, []);
  return h(MuiThemeProvider, [h(Content)]);
}

export default App;
