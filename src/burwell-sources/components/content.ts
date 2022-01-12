import IndexMapContainer from "./index-map";
import IndexMapInfoContainer from "./index-map-info";
import h from "@macrostrat/hyper";
import { InfoDrawer } from "./info-drawer";

const Content = () => {
  return h("div.full-height", [
    h(IndexMapContainer),
    h(IndexMapInfoContainer),
    h(InfoDrawer),
  ]);
};

export default Content;
