import { Component, forwardRef } from "react";
import { getPBDBData } from "./filter-helpers";
import h from "@macrostrat/hyper";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import { buildMacrostratStyle } from "@macrostrat/mapbox-styles";
import { setMapStyle } from "./style-helpers";
import { MapLayer } from "~/map-interface/app-state";
import { ColumnProperties } from "~/map-interface/app-state/handlers/columns";
import { SETTINGS } from "~/map-interface/settings";

const highlightLayers = [
  { layer: "pbdb-points", source: "pbdb-points" },
  { layer: "pbdb-points-clustered", source: "pbdb-points" },
  { layer: "pbdb-clusters", source: "pbdb-clusters" },
];

interface MapProps {
  use3D: boolean;
  isDark: boolean;
  mapIsRotated: boolean;
  onQueryMap: (event: any, columns: ColumnProperties[]) => void;
  plateModelId: number;
  runAction: (action: any) => void;
}

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

    this.map.on("moveend", () => {
      // Force a hit to the API to refresh
      if (this.props.mapLayers.has(MapLayer.FOSSILS)) {
        this.refreshPBDB();
      }
    });

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
      let crossSectionLine = this.props.crossSectionLine;
      let crossSectionCoords = crossSectionLine?.coordinates ?? [];
      if (
        (crossSectionLine != null && crossSectionCoords.length < 2) ||
        event.originalEvent.shiftKey
      ) {
        crossSectionLine ??= { type: "LineString", coordinates: [] };

        if (crossSectionCoords.length === 2) {
          // Restaoss sections
          crossSectionCoords = [];
        }
        crossSectionCoords.push([event.lngLat.lng, event.lngLat.lat]);
        this.props.runAction({
          type: "update-cross-section",
          line: {
            type: "LineString",
            coordinates: crossSectionCoords,
          },
        });
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
    const { mapStyle } = nextProps;

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
    // const mapStyle = buildMacrostratStyle({
    //   tileserverDomain: SETTINGS.burwellTileDomain,
    // });
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

// PBDB hexgrids and points are refreshed on every map move
export async function refreshPBDB(map, pointsRef, filters) {
  let bounds = map.getBounds();
  let zoom = map.getZoom();
  const maxClusterZoom = 7;
  pointsRef.current = await getPBDBData(filters, bounds, zoom, maxClusterZoom);

  // Show or hide the proper PBDB layers
  if (zoom < maxClusterZoom) {
    map.getSource("pbdb-clusters").setData(pointsRef.current);
    map.setLayoutProperty("pbdb-clusters", "visibility", "visible");
    map.setLayoutProperty("pbdb-points-clustered", "visibility", "none");
    //  map.map.setLayoutProperty('pbdb-point-cluster-count', 'visibility', 'none')
    map.setLayoutProperty("pbdb-points", "visibility", "none");
  } else {
    map.getSource("pbdb-points").setData(pointsRef.current);

    //map.map.getSource("pbdb-clusters").setData(map.pbdbPoints);
    map.setLayoutProperty("pbdb-clusters", "visibility", "none");
    map.setLayoutProperty("pbdb-points-clustered", "visibility", "visible");
    //    map.map.setLayoutProperty('pbdb-point-cluster-count', 'visibility', 'visible')
    // map.map.setLayoutProperty("pbdb-points", "visibility", "visible");
  }
}
