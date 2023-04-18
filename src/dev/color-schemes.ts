import { VectorMapInspectorPage, MacrostratVectorTileset } from "./map-layers";
import h from "@macrostrat/hyper";
import { useState } from "react";
import { ButtonGroup, Button } from "@blueprintjs/core";
import { buildMacrostratStyle } from "@macrostrat/map-interface/src/styles";

const baseStyle = buildMacrostratStyle({
  tileserverDomain: "https://tiles.macrostrat.org",
});

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
              ["<", ["to-number", ["get", "best_age_top"], 1], 0.0001],
              ["==", ["get", "lith_class1"], "sedimentary"],
            ],
            "#FFF6BD", // yellow
            [
              "all",
              ["<", ["to-number", ["get", "best_age_top"], 1], 0.02],
              ["==", ["get", "lith_class1"], "sedimentary"],
            ],
            "#FFD4B2", // light orange
            ["==", ["get", "lith_class1"], "igneous"],
            [
              "case",
              [
                "any",
                ["==", ["get", "lith_type1"], "volcanic"],
                ["==", ["get", "lith_type2"], "volcanic"],
              ],
              [
                "case",
                ["<", ["to-number", ["get", "best_age_bottom"], 24], 1],
                "#CD0404",
                ["<", ["to-number", ["get", "best_age_bottom"], 24], 30],
                "red",
                ["<", ["to-number", ["get", "best_age_bottom"], 24], 500],
                "#EB455F", // magenta
                "#850000", // pink
              ],
              "#F56EB3", // pink
            ],
            ["==", ["get", "lith_class1"], "sedimentary"],
            //["get", "color"],
            [
              "case",
              ["==", ["get", "lith_type1"], "carbonate"],
              "#82AAE3",
              "#91D8E4",
            ],

            //"", // green
            ["==", ["get", "lith_class1"], "metamorphic"],
            "#460C68", // purple
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
