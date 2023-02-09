import { useState } from "react";
import h from "@macrostrat/hyper";
import { Navbar, Button } from "@blueprintjs/core";
import {
  useBurwellState,
  getVisibleScale,
  useBurwellActions,
} from "../app-state";
import Options from "./options";

import FeatureList from "./feature-list";
import { InfoDrawerContainer } from "~/map-interface/components/info-drawer";
import { useEffect } from "react";

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

function Header({ len, btn }) {
  return h(Navbar, [
    h.if(len == 0)(Navbar.Group, [
      h(Navbar.Heading, [
        h("div.expansion-summary-title", ["Macrostrat - map sources"]),
      ]),
    ]),
    h.if(len > 0)(Navbar.Group, [
      h(BackButton),
      h(Navbar.Heading, { style: { marginLeft: "20px" } }, [
        h("div.expansion-summary-title", ["Selected Sources"]),
      ]),
    ]),
    h(Navbar.Group, { align: "right" }, [h(Options), btn]),
  ]);
}

function InfoDrawer() {
  const { selectedFeatures, maps, selectedScale } = useBurwellState(
    (state) => state
  );

  const [open, setOpen] = useState(true);

  const data = getVisibleScale(maps, selectedScale);

  const len = selectedFeatures.length;

  useEffect(() => {
    if (len > 0 && !open) {
      setOpen(true);
    }
  }, [len]);

  function CloseBtn() {
    return h(Button, {
      style: { marginRight: "-12px" },
      minimal: true,
      onClick: () => setOpen(!open),
      icon: open ? "chevron-up" : "chevron-down",
    });
  }
  return h(
    "div.infodrawer-container-sources",
    null,
    h(InfoDrawerContainer, [
      h(Header, { len, btn: h(CloseBtn) }),
      h.if(len == 0)(FeatureList, { features: data, open }),
      h.if(len > 0)(FeatureList, { features: selectedFeatures, open }),
    ])
  );
}

export { InfoDrawer };
