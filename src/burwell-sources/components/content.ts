import IndexMapContainer from "./index-map";
import IndexMapInfoContainer from "./index-map-info";
import Header from "./header";
import FeatureList from "./feature-list";
import h from "@macrostrat/hyper";
import { useBurwellState } from "~/burwell-sources/app-state";

const Content = () => {
  const { view } = useBurwellState((state) => state);
  return h("div.full-height", [
    h(Header),
    h.if(view == "map")(IndexMapContainer),
    h.if(view !== "map")(FeatureList),
    h(IndexMapInfoContainer),
  ]);
};

export default Content;
