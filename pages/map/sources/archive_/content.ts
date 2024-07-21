import IndexMapContainer from "../components/map";
import h from "@macrostrat/hyper";
import { InfoDrawer } from "../components/info-drawer";

const Content = () => {
  return h("div.full-height", [h(IndexMapContainer), h(InfoDrawer)]);
};

export default Content;
