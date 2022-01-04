import React from "react";
import { Toolbar, ToolbarGroup, ToolbarTitle } from "material-ui/Toolbar";
import Options from "./options";
import {
  useBurwellActions,
  useBurwellState,
} from "~/burwell-sources/app-state";

const Header = () => {
  const runAction = useBurwellActions();
  const { selectedScale } = useBurwellState((state) => state);
  const selectScale = (scale) => {
    runAction({ type: "select-scale", selectedScale: scale });
  };

  return (
    <Toolbar className="header">
      <ToolbarGroup>
        <ToolbarTitle
          className="title"
          text="Macrostrat - map sources"
        ></ToolbarTitle>
      </ToolbarGroup>
      <ToolbarGroup>
        <Options />
      </ToolbarGroup>
    </Toolbar>
  );
};

export default Header;
