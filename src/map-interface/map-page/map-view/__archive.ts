import { MapLayer } from "~/map-interface/app-state";
import { Component } from "react";

class VestigialMap extends Component<MapProps, {}> {
  map: mapboxgl.Map;
  marker: mapboxgl.Marker | null = null;
  crossSectionEndpoints: [number, number][] = [];
  constructor(props) {
    super(props);
    this.crossSectionEndpoints = [];

    this.maxValue = 500;
    this.previousZoom = 0;

    // We need to store these for cluster querying...
    this.pbdbPoints = {};

    // Keep track of unique ids for interaction states
    this.hoverStates = {};
    this.selectedStates = {};
  }

  setupMapHandlers() {
    if (this.map != null) {
      return;
    }

    this.map = this.props.mapRef.current;

    if (this.map == null) {
      return;
    }
    // disable map rotation using right click + drag
    //this.map.dragRotate.disable();

    // disable map rotation using touch rotation gesture
    //this.map.touchZoomRotate.disableRotation();
  }

  // Handle updates to the state of the map
  // Since react isn't in charge of updating the map state we use shouldComponentUpdate
  // and always return `false` to prevent DOM updates
  // We basically intercept the changes, handle them, and tell React to ignore them
  shouldComponentUpdate(nextProps) {
    const { mapStyle } = nextProps;
    this.setupMapHandlers();
    if (this.map == null || mapStyle == null) return false;

    setMapStyle(
      this,
      this.map,
      buildMacrostratStyle({
        tileserverDomain: SETTINGS.burwellTileDomain,
      }),
      nextProps
    );

    if (nextProps.mapIsRotated !== this.props.mapIsRotated) {
      return true;
    }

    return false;
  }

  render() {
    return null;
  }

  // Update the colors of the hexgrids
  updateColors(data) {
    for (let i = 0; i < data.length; i++) {
      this.map.setFeatureState(
        {
          source: "pbdb",
          sourceLayer: "hexgrid",
          id: data[i].hex_id,
        },
        {
          color: this.colorScale(parseInt(data[i].count)),
        }
      );
    }
  }

  colorScale(val) {
    let mid = this.maxValue / 2;

    // Max
    if (Math.abs(val - this.maxValue) <= Math.abs(val - mid)) {
      return "#2171b5";
      // Mid
    } else if (Math.abs(val - mid) <= Math.abs(val - 1)) {
      return "#6baed6";
      // Min
    } else {
      return "#bdd7e7";
    }
  }
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
