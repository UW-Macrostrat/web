import IndexMapContainer from "./index-map";
import h from "@macrostrat/hyper";
import { InfoDrawer } from "./info-drawer";

const Content = () => {
  return h("div.full-height", [h(IndexMapContainer), h(InfoDrawer)]);
};

export default Content;
