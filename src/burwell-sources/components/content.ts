import IndexMapContainer from "./index-map";
import IndexMapInfoContainer from "./index-map-info";
import h from "@macrostrat/hyper";
import { useBurwellState } from "~/burwell-sources/app-state";
import { InfoDrawer } from "./info-drawer";

const Content = () => {
  const { view } = useBurwellState((state) => state);
  return h("div.full-height", [
    h(IndexMapContainer),
    h(IndexMapInfoContainer),
    h(InfoDrawer),
  ]);
};

export default Content;
