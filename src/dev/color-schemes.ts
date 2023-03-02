import { VectorMapInspectorPage, MacrostratVectorTileset } from "./map";
import h from "@macrostrat/hyper";
import { useState } from "react";
import { ButtonGroup, Button } from "@blueprintjs/core";
import { buildMacrostratStyle } from "~/map-interface/map-page/map-style";

const baseStyle = buildMacrostratStyle();

const newStyle = {
  ...baseStyle,
  layers: baseStyle.layers.map((layer) => {
    if (layer.id == "burwell_fill") {
      return {
        ...layer,
        paint: {
          ...layer.paint,
          "fill-color": [
            "case",
            [
              "all",
              ["==", ["to-number", ["get", "best_age_top"], 1], 0],
              ["==", ["get", "lith_class1"], "sedimentary"],
            ],
            "yellow",
            [
              "all",
              ["<", ["to-number", ["get", "best_age_top"], 1], 0.02],
              ["==", ["get", "lith_class1"], "sedimentary"],
            ],
            "goldenrod",
            ["==", ["get", "lith_class1"], "igneous"],
            ["case", ["==", ["get", "lith_type2"], "volcanic"], "red", "pink"],
            ["==", ["get", "lith_class1"], "sedimentary"],
            "blue",
            ["==", ["get", "lith_class1"], "metamorphic"],
            "green",
            "#aaa",
          ],
        },
      };
    }
    return layer;
  }),
};

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
      overlayStyle: newStyle,
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
