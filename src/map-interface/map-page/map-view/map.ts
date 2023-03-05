import { Component, forwardRef } from "react";
import { getPBDBData } from "./filter-helpers";
import h from "@macrostrat/hyper";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import { buildMacrostratStyle } from "../map-style";
import { setMapStyle } from "./style-helpers";
import { MapLayer } from "~/map-interface/app-state";
import { ColumnProperties } from "~/map-interface/app-state/handlers/columns";

const maxClusterZoom = 6;
const highlightLayers = [
  { layer: "pbdb-points", source: "pbdb-points" },
  { layer: "pbdb-points-clustered", source: "pbdb-points" },
  { layer: "pbdb-clusters", source: "pbdb-clusters" },
];

interface MapProps {
  use3D: boolean;
  isDark: boolean;
  mapIsRotated: boolean;
  mapIsLoading: boolean;
  onQueryMap: (event: any, columns: ColumnProperties[]) => void;
  plateModelId: number;
}

const blankMapStyle = {
  version: 8,
  sources: {},
  layers: [],
};

class VestigialMap extends Component<MapProps, {}> {
  map: mapboxgl.Map;
  marker: mapboxgl.Marker | null = null;
  crossSectionEndpoints: [number, number][] = [];
  constructor(props) {
    super(props);
    this.mapLoaded = false;
    this.crossSectionEndpoints = [];

    this.maxValue = 500;
    this.previousZoom = 0;

    // We need to store these for cluster querying...
    this.pbdbPoints = {};

    // Keep track of unique ids for interaction states
    this.hoverStates = {};
    this.selectedStates = {};
  }

  onStyleLoad() {
    // The initial draw of the layers
    // console.log("Style loaded", this.props);
    if (!this.map.style._loaded) {
      return;
    }

    const { mapLayers } = this.props;
    buildMacrostratStyle().layers.forEach((layer) => {
      // Populate the objects that track interaction states
      this.hoverStates[layer.id] = null;
      this.selectedStates[layer.id] = null;

      // Accomodate any URI parameters
      if (
        layer.source === "burwell" &&
        layer["source-layer"] === "units" &&
        mapLayers.has(MapLayer.BEDROCK)
      ) {
        this.map.setLayoutProperty(layer.id, "visibility", "none");
      }
      if (
        layer.source === "burwell" &&
        layer["source-layer"] === "lines" &&
        mapLayers.has(MapLayer.LINES)
      ) {
        this.map.setLayoutProperty(layer.id, "visibility", "none");
      }
      if (
        (layer.source === "pbdb" || layer.source === "pbdb-points") &&
        mapLayers.has(MapLayer.FOSSILS)
      ) {
        this.map.setLayoutProperty(layer.id, "visibility", "visible");
      }
      if (layer.source === "columns" && mapLayers.has(MapLayer.COLUMNS)) {
        this.map.setLayoutProperty(layer.id, "visibility", "visible");
      }
    });

    if (mapLayers.has(MapLayer.FOSSILS)) {
      this.refreshPBDB();
    }

    // NO idea why timeout is needed
    setTimeout(() => {
      this.mapLoaded = true;
    }, 1);
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

    this.map.on("moveend", () => {
      // Force a hit to the API to refresh
      if (this.props.mapLayers.has(MapLayer.FOSSILS)) {
        this.refreshPBDB();
      }
    });

    this.map.on("style.load", this.onStyleLoad.bind(this));
    this.onStyleLoad();

    highlightLayers.forEach((layer) => {
      this.map.on("mousemove", layer.layer, (evt) => {
        if (evt.features) {
          if (this.hoverStates[layer.layer]) {
            this.map.setFeatureState(
              { source: layer.source, id: this.hoverStates[layer.layer] },
              { hover: false }
            );
          }
          this.hoverStates[layer.layer] = evt.features[0].id;
          this.map.setFeatureState(
            { source: layer.source, id: evt.features[0].id },
            { hover: true }
          );
        }
      });

      this.map.on("mouseleave", layer.layer, (evt) => {
        if (this.hoverStates[layer.layer]) {
          this.map.setFeatureState(
            { source: layer.source, id: this.hoverStates[layer.layer] },
            { hover: false }
          );
        }
        this.hoverStates[layer.layer] = null;
      });
    });

    this.map.on("click", (event) => {
      // If the elevation drawer is open and we are awaiting to points, add them
      if (
        (this.props.crossSectionOpen || event.originalEvent.shiftKey) &&
        this.crossSectionEndpoints.length <= 2
      ) {
        this.crossSectionEndpoints.push([event.lngLat.lng, event.lngLat.lat]);
        const src = this.map.getSource("crossSectionEndpoints");
        const newEndpoints = this.crossSectionEndpoints.map((p) => {
          return {
            type: "Feature",
            geometry: {
              type: "Point",
              coordinates: p,
            },
          };
        });

        console.log(src);
        src.setData({
          type: "FeatureCollection",
          features: [...(src._data?.features ?? []), ...newEndpoints],
        });
        if (this.crossSectionEndpoints.length === 2) {
          this.props.runAction({
            type: "set-cross-section-line",
            line: {
              type: "LineString",
              coordinates: [...this.crossSectionEndpoints],
            },
          });
          this.map.getSource("crossSectionLine").setData({
            type: "FeatureCollection",
            features: [
              {
                type: "Feature",
                geometry: {
                  type: "LineString",
                  coordinates: [...this.crossSectionEndpoints],
                },
              },
            ],
          });
          this.crossSectionEndpoints = [];
        }
        return;
      }

      const mapZoom = this.map.getZoom();

      // If we are viewing fossils, prioritize clicks on those
      if (this.props.mapLayers.has(MapLayer.FOSSILS)) {
        let collections = this.map.queryRenderedFeatures(event.point, {
          layers: ["pbdb-points-clustered", "pbdb-points", "pbdb-clusters"],
        });
        // Clicked on a hex grid
        if (
          collections.length &&
          collections[0].properties.hasOwnProperty("hex_id")
        ) {
          this.map.zoomTo(mapZoom + 1, { center: event.lngLat });
          return;

          // Clicked on a summary cluster
        } else if (
          collections.length &&
          collections[0].properties.hasOwnProperty("oid") &&
          collections[0].properties.oid.split(":")[0] === "clu" &&
          mapZoom <= 12
        ) {
          this.map.zoomTo(mapZoom + 2, { center: event.lngLat });
          return;
          // Clicked on a real cluster of collections

          // ... the way we do clustering here is kind of strange.
        } else if (
          collections.length &&
          (collections[0].properties.hasOwnProperty("cluster") ||
            // Summary cluster when zoom is too high
            collections[0].properties.oid.split(":")[0] === "clu")
        ) {
          // via https://jsfiddle.net/aznkw784/
          let pointsInCluster = this.pbdbPoints.features
            .filter((f) => {
              let pointPixels = this.map.project(f.geometry.coordinates);
              let pixelDistance = Math.sqrt(
                Math.pow(event.point.x - pointPixels.x, 2) +
                  Math.pow(event.point.y - pointPixels.y, 2)
              );
              return Math.abs(pixelDistance) <= 50;
            })
            .map((f) => {
              return f.properties.oid.replace("col:", "");
            });
          this.props.runAction({
            type: "get-pbdb",
            collection_nos: pointsInCluster,
          });

          // Clicked on an unclustered point
        } else if (
          collections.length &&
          collections[0].properties.hasOwnProperty("oid")
        ) {
          let collection_nos = collections.map((col) => {
            return col.properties.oid.replace("col:", "");
          });
          this.props.runAction({ type: "get-pbdb", collection_nos });
          //    return
        } else {
          // Otherwise make sure that old fossil collections aren't visible
          this.props.runAction({ type: "reset-pbdb" });
        }
      }

      // Otherwise try to query the geologic map
      let features = this.map.queryRenderedFeatures(event.point, {
        layers: ["burwell_fill", "column_fill", "filtered_column_fill"],
      });

      let burwellFeatures = features
        .filter((f) => {
          if (f.layer.id === "burwell_fill") return f;
        })
        .map((f) => {
          return f.properties;
        });

      const columns = features
        .filter((f) => {
          if (
            f.layer.id === "column_fill" ||
            f.layer.id === "filtered_column_fill"
          )
            return f;
        })
        .map((f) => {
          return f.properties;
        });

      this.props.onQueryMap(event, columns);
    });
  }

  // Handle updates to the state of the map
  // Since react isn't in charge of updating the map state we use shouldComponentUpdate
  // and always return `false` to prevent DOM updates
  // We basically intercept the changes, handle them, and tell React to ignore them
  shouldComponentUpdate(nextProps) {
    this.setupMapHandlers();
    if (this.map == null) return false;

    setMapStyle(this, this.map, buildMacrostratStyle(), nextProps);

    if (nextProps.mapIsRotated !== this.props.mapIsRotated) {
      return true;
    }

    // Watch the state of the application and adjust the map accordingly
    if (
      !nextProps.crossSectionOpen &&
      this.props.crossSectionOpen &&
      this.map
    ) {
      this.crossSectionEndpoints = [];
      this.map.getSource("crossSectionEndpoints").setData({
        type: "FeatureCollection",
        features: [],
      });
      this.map.getSource("crossSectionLine").setData({
        type: "FeatureCollection",
        features: [],
      });
    }
    // Bedrock
    if (
      JSON.stringify(nextProps.mapCenter) !=
      JSON.stringify(this.props.mapCenter)
    ) {
      if (nextProps.mapCenter.type === "place") {
        const { bbox, center } = nextProps.mapCenter.place;
        if (bbox?.length == 4) {
          let bounds = [
            [
              nextProps.mapCenter.place.bbox[0],
              nextProps.mapCenter.place.bbox[1],
            ],
            [
              nextProps.mapCenter.place.bbox[2],
              nextProps.mapCenter.place.bbox[3],
            ],
          ];
          this.map.fitBounds(bounds, {
            duration: 0,
            maxZoom: 16,
          });
        } else {
          this.map.flyTo({
            center,
            duration: 0,
            zoom: Math.max(
              nextProps.mapPosition?.camera?.target?.zoom ?? 10,
              14
            ),
          });
        }
      } else {
        // zoom to user location
      }
    }
    const mapStyle = buildMacrostratStyle();
    // Handle changes to map filters
    if (nextProps.filters != this.props.filters) {
      // If all filters have been removed simply reset the filter states
      if (nextProps.filters.length === 0) {
        // Remove filtered columns and add unfiltered columns
        if (this.props.mapLayers.has(MapLayer.COLUMNS)) {
          mapStyle.layers.forEach((layer) => {
            if (layer.source === "columns") {
              this.map.setLayoutProperty(layer.id, "visibility", "visible");
            }
          });
          mapStyle.layers.forEach((layer) => {
            if (layer.source === "filteredColumns") {
              this.map.setLayoutProperty(layer.id, "visibility", "none");
            }
          });
        }

        if (nextProps.mapLayers.has(MapLayer.FOSSILS)) {
          this.refreshPBDB();
        }

        return false;
      }

      if (nextProps.mapLayers.has(MapLayer.FOSSILS)) {
        this.refreshPBDB();
      }

      // Update the map styles
      return false;
    }
    return false;
  }

  // PBDB hexgrids and points are refreshed on every map move
  async refreshPBDB() {
    let bounds = this.map.getBounds();
    let zoom = this.map.getZoom();
    const maxClusterZoom = 7;
    this.pbdbPoints = await getPBDBData(
      this.props.filters,
      bounds,
      zoom,
      maxClusterZoom
    );

    // Show or hide the proper PBDB layers
    if (zoom < maxClusterZoom) {
      this.map.getSource("pbdb-clusters").setData(this.pbdbPoints);
      this.map.setLayoutProperty("pbdb-clusters", "visibility", "visible");
      this.map.setLayoutProperty("pbdb-points-clustered", "visibility", "none");
      //  map.map.setLayoutProperty('pbdb-point-cluster-count', 'visibility', 'none')
      this.map.setLayoutProperty("pbdb-points", "visibility", "none");
    } else {
      this.map.getSource("pbdb-points").setData(this.pbdbPoints);

      //map.map.getSource("pbdb-clusters").setData(map.pbdbPoints);
      this.map.setLayoutProperty("pbdb-clusters", "visibility", "none");
      this.map.setLayoutProperty(
        "pbdb-points-clustered",
        "visibility",
        "visible"
      );
      //    map.map.setLayoutProperty('pbdb-point-cluster-count', 'visibility', 'visible')
      // map.map.setLayoutProperty("pbdb-points", "visibility", "visible");
    }
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

  render() {
    return null;
  }
}

export default forwardRef((props, ref) =>
  h(VestigialMap, { ...props, elementRef: ref })
);
