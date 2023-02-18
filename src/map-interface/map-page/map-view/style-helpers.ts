import { MapLayer } from "~/map-interface/app-state";
import { inDarkMode } from "@macrostrat/ui-components";
import { useAppState } from "~/map-interface/app-state";
import { getBaseMapStyle } from "./utils";

export function useBaseMapStyle() {
  const mapLayers = useAppState((state) => state.core.mapLayers);
  const isDarkMode = inDarkMode();
  return getBaseMapStyle(mapLayers, isDarkMode);
}

function setMapStyle(class_, map, mapStyle, props) {
  const prevMapLayers = class_.props.mapLayers;
  const { mapLayers } = props;

  mapStyle.layers.forEach((layer) => {
    if (map.getSource(layer.source) && map.getLayer(layer.id)) {
      const visibility = map.getLayoutProperty(layer.id, "visibility");
      if (layer.source === "burwell" && layer["source-layer"] === "units") {
        const showBedRock = mapLayers.has(MapLayer.BEDROCK)
          ? "visible"
          : "none";
        if (visibility !== showBedRock) {
          map.setLayoutProperty(layer.id, "visibility", showBedRock);
        }
      } else if (
        layer.source === "burwell" &&
        layer["source-layer"] === "lines"
      ) {
        const showLines = mapLayers.has(MapLayer.LINES) ? "visible" : "none";
        if (visibility !== showLines) {
          map.setLayoutProperty(layer.id, "visibility", showLines);
        }
      } else if (
        layer.source === "pbdb-points" ||
        layer.source === "pbdb-clusters"
      ) {
        // points and clusters are visible at different zooms
        // currently this difference is handled by refreshPBDB()
        // it's annoying but doesn't cause an infinite loop
        const hasFossils = mapLayers.has(MapLayer.FOSSILS);
        if (
          class_.props.mapLayers.has(MapLayer.FOSSILS) != hasFossils &&
          hasFossils
        ) {
          class_.refreshPBDB();
        } else {
          map.setLayoutProperty(
            layer.id,
            "visibility",
            hasFossils ? "visible" : "none"
          );
        }
      } else if (layer.source === "columns") {
        const showColumns =
          mapLayers.has(MapLayer.COLUMNS) && !props.filters.length
            ? "visible"
            : "none";
        if (visibility !== showColumns) {
          map.setLayoutProperty(layer.id, "visibility", showColumns);
        }
      } else if (layer.source === "filteredColumns") {
        const showFilteredColumns =
          mapLayers.has(MapLayer.COLUMNS) && props.filters.length
            ? "visible"
            : "none";
        if (
          JSON.stringify(props.filteredColumns) !=
          JSON.stringify(class_.props.filteredColumns)
        ) {
          map.getSource("filteredColumns").setData(props.filteredColumns);
        }
        if (visibility != showFilteredColumns) {
          map.setLayoutProperty(layer.id, "visibility", showFilteredColumns);
        }
      }
    }
  });
}

export { setMapStyle };
