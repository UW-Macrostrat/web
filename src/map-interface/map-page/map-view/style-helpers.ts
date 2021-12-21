function setMapStyle(class_, map, mapStyle, props) {
  mapStyle.layers.forEach((layer) => {
    if (map.getSource(layer.source) && map.getLayer(layer.id)) {
      const visibility = map.getLayoutProperty(layer.id, "visibility");
      if (layer.source === "burwell" && layer["source-layer"] === "units") {
        const showBedRock = props.mapHasBedrock ? "visible" : "none";
        if (visibility !== showBedRock) {
          map.setLayoutProperty(layer.id, "visibility", showBedRock);
        }
      } else if (
        layer.source === "burwell" &&
        layer["source-layer"] === "lines"
      ) {
        const showLines = props.mapHasLines ? "visible" : "none";
        if (visibility !== showLines) {
          map.setLayoutProperty(layer.id, "visibility", showLines);
        }
      } else if (
        layer.source === "pbdb" ||
        layer.source === "pbdb-points" ||
        layer.source === "pbdb-clusters"
      ) {
        const showFossils = props.mapHasFossils ? "visible" : "none";
        if (visibility !== showFossils) {
          if (showFossils == "visible") {
            class_.refreshPBDB();
          } else {
            map.setLayoutProperty(layer.id, "visibility", showFossils);
          }
        }
      } else if (layer.source === "columns") {
        const showColumns =
          props.mapHasColumns && !props.filters.length ? "visible" : "none";
        if (visibility !== showColumns) {
          map.setLayoutProperty(layer.id, "visibility", showColumns);
        }
      } else if (layer.source === "filteredColumns") {
        const showFilteredColumns =
          props.mapHasColumns && props.filters.length ? "visible" : "none";
        if (
          JSON.stringify(props.filteredColumns) !=
          JSON.stringify(class_.props.filteredColumns)
        ) {
          map.getSource("filteredColumns").setData(props.filteredColumns);
        }
        if (visibility != showFilteredColumns) {
          map.setLayoutProperty(layer.id, "visibility", showFilteredColumns);
        }
      } else if (layer.source == "info_marker") {
        if (!props.infoDrawerOpen) {
          map.setLayoutProperty(layer.id, "visibility", "none");
        }
      }
    }
  });
}

export { setMapStyle };
