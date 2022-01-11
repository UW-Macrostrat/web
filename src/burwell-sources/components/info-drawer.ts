import h from "@macrostrat/hyper";
import { Card } from "@blueprintjs/core";
import Header from "./header";
import FeatureList from "./feature-list";

function InfoDrawer() {
  return h("div.infodrawer-container", { style: { margin: "20px" } }, [
    h(Card, { className: "infodrawer" }, [h(Header), h(FeatureList)]),
  ]);
}

export { InfoDrawer };
