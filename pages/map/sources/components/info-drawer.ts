import { Button, Navbar } from "@blueprintjs/core";
import h from "@macrostrat/hyper";
import { useState, useEffect } from "react";
import {
  getVisibleScale,
  useBurwellActions,
  useBurwellState,
} from "../app-state";
import Options from "./options";
import { InfoDrawerContainer } from "@macrostrat/map-interface";
import  FeatureList  from "./feature-list.tsx";
import { PageBreadcrumbs } from "~/components";

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
    h.if(len == 0)(Navbar.Group, [h(Navbar.Heading, [h(PageBreadcrumbs)])]),
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
    h(InfoDrawerContainer, [
      h(Header, { len, btn: h(CloseBtn) }),
      len == 0 ? h(FeatureList, { features: data, open }) : null,
      len > 0 ? h(FeatureList, { features: selectedFeatures, open }) : null,
    ])
  );
}

export { InfoDrawer };
