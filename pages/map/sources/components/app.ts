import { useEffect } from "react";
import { useBurwellActions } from "#/map/sources/app-state";
import hyper from "@macrostrat/hyper";
import IndexMapContainer from "./map";
import { InfoDrawer } from "./info-drawer";
import styles from "./main.module.scss";
// // Needed for onTouchTap
// import injectTapEventPlugin from 'react-tap-event-plugin'
// // http://stackoverflow.com/a/34015469/988941
// injectTapEventPlugin()

const h = hyper.styled(styles);

function App() {
  const runAction = useBurwellActions();
  useEffect(() => {
    // Fetch the data on load
    runAction({ type: "request-data" });
    runAction({ type: "fetch-data" });
  }, []);
  return h("div.full-height", [
    h(IndexMapContainer),
    // h("div.content-overlay", [h(InfoDrawer)]),
  ]);
}

export default App;
