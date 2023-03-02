import { VectorMapInspectorPage, MacrostratVectorTileset } from "./map";
import h from "@macrostrat/hyper";
import { useState } from "react";
import { ButtonGroup, Button } from "@blueprintjs/core";

export function MapColorsInspector() {
  const [tileset, setTileset] = useState(MacrostratVectorTileset.CartoSlim);
  const tilesetSwitch = h("p.tileset-switch", [
    h(ButtonGroup, [
      h(TilesetButton, {
        tileset,
        setTileset,
        value: MacrostratVectorTileset.Carto,
      }),
      h(TilesetButton, {
        tileset,
        setTileset,
        value: MacrostratVectorTileset.CartoSlim,
      }),
    ]),
  ]);

  return h(
    VectorMapInspectorPage,
    {
      title: "Map colors",
      tileset,
    },
    [
      h("p", "Testing environment for new map coloring strategies."),
      tilesetSwitch,
    ]
  );
}

function TilesetButton({ tileset, setTileset, value }) {
  return h(
    Button,
    {
      onClick: () => setTileset(value),
      disabled: tileset == value,
    },
    value
  );
}
