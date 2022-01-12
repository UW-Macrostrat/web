import h from "@macrostrat/hyper";
import { Card, Navbar, Button } from "@blueprintjs/core";
import {
  useBurwellState,
  getVisibleScale,
  useBurwellActions,
} from "../app-state";
import Options from "./options";

import FeatureList from "./feature-list";

function BackButton() {
  const runAction = useBurwellActions();
  const removeSelectedFeatures = () => {
    runAction({ type: "select-features", selectedFeatures: [] });
  };
  return h(
    Button,
    {
      icon: "chevron-left",
      minimal: true,
      onClick: removeSelectedFeatures,
    },
    ["Back"]
  );
}

function Header({ len }) {
  return h(Navbar, [
    h.if(len == 0)(Navbar.Group, [
      h(Navbar.Heading, [
        h("div.expansion-summary-title", ["Macrostrat - map sources"]),
      ]),
    ]),
    h.if(len > 0)(Navbar.Group, [
      h(BackButton),
      h(Navbar.Heading, [
        h("div.expansion-summary-title", ["Selected Sources"]),
      ]),
    ]),
    h(Navbar.Group, { align: "right" }, [h(Options)]),
  ]);
}

function InfoDrawer() {
  const { selectedFeatures, maps, selectedScale } = useBurwellState(
    (state) => state
  );
  const data = getVisibleScale(maps, selectedScale);

  const len = selectedFeatures.length;

  return h("div.infodrawer-container", { style: { margin: "20px" } }, [
    h(Card, { className: "infodrawer" }, [
      h(Header, { len }),
      h.if(len == 0)(FeatureList, { features: data }),
      h.if(len > 0)(FeatureList, { features: selectedFeatures }),
    ]),
  ]);
}

export { InfoDrawer };
