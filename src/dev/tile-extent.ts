import { useMapConditionalStyle, useMapRef } from "@macrostrat/mapbox-react";
import { tileToGeoJSON } from "@mapbox/tilebelt";
import { useCallback } from "react";

type TileIndex = { x: number; y: number; z: number };

export function TileExtentLayer({
  tile,
  color = "red",
}: {
  tile: TileIndex | null;
  color?: string;
}) {
  const styleCallback = useCallback(
    (map, val: TileIndex) => {
      const style = map.getStyle();
      if (style.layers == null) return;
      style.layers = style.layers.filter((l) => l.id != "tile-extent");
      if (val == null) {
        return map.setStyle(style);
      }
      const { x, y, z } = val;
      const extent = tileToGeoJSON([x, y, z]);
      const source = {
        type: "geojson",
        data: extent,
      };
      const layer = {
        id: "tile-extent",
        type: "line",
        source: "tile-extent",
        paint: {
          "line-color": color,
          "line-width": 2,
        },
      };
      style.sources["tile-extent"] = source;
      style.layers.push(layer);
      map.setStyle(style);
    },
    [color]
  );
  const map = useMapRef();
  useMapConditionalStyle(map, tile, styleCallback);
  return null;
}
