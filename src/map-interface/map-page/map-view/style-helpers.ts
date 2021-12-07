function setMapStyle(map, mapStyle, props) {
  mapStyle.layers.forEach((layer) => {
    let visibility = map.getLayoutProperty(layer.id, "visibility");

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
        map.setLayoutProperty(layer.id, "visibility", showFossils);
      }
    }
  });
}

export { setMapStyle };
