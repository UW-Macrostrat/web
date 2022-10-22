import { Component, forwardRef } from "react";
import { SETTINGS } from "../../Settings";
import { mapStyle } from "../map-styles";
import {
  getRemovedOrNewFilters,
  getToApply,
  PBDBHelper,
} from "./filter-helpers";
import h from "@macrostrat/hyper";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import { MercatorCoordinate, FreeCameraOptions } from "mapbox-gl";
import { setMapStyle } from "./style-helpers";
import classNames from "classnames";

const maxClusterZoom = 6;
const highlightLayers = [
  { layer: "pbdb-points", source: "pbdb-points" },
  { layer: "pbdb-points-clustered", source: "pbdb-points" },
  { layer: "pbdb-clusters", source: "pbdb-clusters" },
];

interface MapProps {
  use3D: boolean;
  mapIsRotated: boolean;
  markerLoadOffset: [number, number];
}

class Map extends Component<MapProps, {}> {
  map: mapboxgl.Map;
  constructor(props) {
    super(props);
    this.swapBasemap = this.swapBasemap.bind(this);
    this.handleFilterChanges = this.handleFilterChanges.bind(this);
    this.mapLoaded = false;
    this.currentSources = [];
    this.elevationPoints = [];

    // Separate time filters and other filters for different rules
    // i.e. time filters are <interval> OR <interval> and all others are AND
    this.timeFilters = [];
    // Keep track of name: index values of time filters for easier removing
    this.timeFiltersIndex = {};

    this.filters = [];
    this.filtersIndex = {};

    this.lithFilters = [];
    this.lithFiltersIndex = {};

    this.stratNameFilters = [];
    this.stratNameFiltersIndex = {};

    this.environmentFilters = [];
    this.environmentFilterIndex = {};

    this.maxValue = 500;
    this.previousZoom = 0;

    this.resMax = {
      0: 143,
      1: 143,
      2: 143,
      3: 76,
      4: 44,
      5: 44,
      6: 29,
      7: 20,
      8: 16,
      9: 16,
      10: 16,
    };

    // We need to store these for cluster querying...
    this.pbdbPoints = {};

    // Keep track of unique ids for interaction states
    this.hoverStates = {};
    this.selectedStates = {};
  }

  componentDidMount() {
    mapboxgl.accessToken = SETTINGS.mapboxAccessToken;

    this.map = new mapboxgl.Map({
      container: "map",
      style: this.props.mapHasSatellite
        ? SETTINGS.satelliteMapURL
        : SETTINGS.baseMapURL,
      maxZoom: 14,
      //maxTileCacheSize: 0,
      logoPosition: "bottom-left",
      trackResize: true,
      //antialias: true,
      //optimizeForTerrain: true,
    });

    this.map.setProjection("globe");

    //this.map.addControl(new ZoomControl(), "top-right");
    //this.map.addControl(new ThreeDControl(), "bottom-right");
    //this.map.addControl(new CompassControl(), "bottom-right");

    const pos = this.props.mapPosition;
    const { pitch = 0, bearing = 0, altitude } = pos.camera;
    const zoom = pos.target?.zoom;
    if (zoom != null && altitude == null) {
      const { lng, lat } = pos.target;
      this.map.setCenter([lng, lat]);
      this.map.setZoom(zoom);
    } else {
      const { altitude, lng, lat } = pos.camera;
      const cameraOptions = new FreeCameraOptions(
        MercatorCoordinate.fromLngLat({ lng, lat }, altitude),
        [0, 0, 0, 1]
      );
      cameraOptions.setPitchBearing(pitch, bearing);

      this.map.setFreeCameraOptions(cameraOptions);
    }

    this.enable3DTerrain(this.props.use3D);

    this.props.mapRef.current = this.map;

    // disable map rotation using right click + drag
    //this.map.dragRotate.disable();

    // disable map rotation using touch rotation gesture
    //this.map.touchZoomRotate.disableRotation();
    const ignoredSources = [
      "elevationMarker",
      "elevationPoints",
      "info_marker",
    ];

    this.map.on("sourcedataloading", (evt) => {
      if (ignoredSources.includes(evt.sourceId) || this.props.mapIsLoading) {
        return;
      }
      this.props.runAction({ type: "map-loading" });
    });

    this.map.on("idle", () => {
      if (!this.props.mapIsLoading) return;
      this.props.runAction({ type: "map-idle" });
    });

    this.map.on("moveend", () => {
      // Force a hit to the API to refresh
      if (this.props.mapHasFossils) {
        this.refreshPBDB();
      }
    });

    this.map.on("style.load", () => {
      // Add the sources to the map
      Object.keys(mapStyle.sources).forEach((source) => {
        if (this.map.getSource(source) == null) {
          this.map.addSource(source, mapStyle.sources[source]);
        }
      });

      // The initial draw of the layers
      mapStyle.layers.forEach((layer) => {
        // Populate the objects that track interaction states
        this.hoverStates[layer.id] = null;
        this.selectedStates[layer.id] = null;

        if (layer.source === "columns" || layer.source === "info_marker") {
          this.map.addLayer(layer);
        } else {
          this.map.addLayer(layer, "airport-label");
        }

        // Accomodate any URI parameters
        if (
          layer.source === "burwell" &&
          layer["source-layer"] === "units" &&
          this.props.mapHasBedrock === false
        ) {
          this.map.setLayoutProperty(layer.id, "visibility", "none");
        }
        if (
          layer.source === "burwell" &&
          layer["source-layer"] === "lines" &&
          this.props.mapHasLines === false
        ) {
          this.map.setLayoutProperty(layer.id, "visibility", "none");
        }
        if (
          (layer.source === "pbdb" || layer.source === "pbdb-points") &&
          this.props.mapHasFossils === true
        ) {
          this.map.setLayoutProperty(layer.id, "visibility", "visible");
        }
        if (layer.source === "columns" && this.props.mapHasColumns === true) {
          this.map.setLayoutProperty(layer.id, "visibility", "visible");
        }
      });

      if (this.props.mapHasFossils) {
        this.refreshPBDB();
      }

      this.enable3DTerrain(this.props.use3D);

      // NO idea why timeout is needed
      setTimeout(() => {
        this.mapLoaded = true;
        this.applyFilters();
      }, 1);
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

    // Hide the infoMarker when the map moves
    this.map.on("movestart", () => {
      if (this.panning) {
        return;
      }
      // Make sure this doesn't fire before infoMarker is added to map
      // Can happen on a slow connection
      if (this.map.getLayer("infoMarker")) {
        // Hide the info marker and close the info drawer
        //this.map.setLayoutProperty("infoMarker", "visibility", "none");
      }
    });

    this.map.on("click", (event) => {
      // If the elevation drawer is open and we are awaiting to points, add them
      if (
        this.props.elevationChartOpen &&
        this.props.elevationData &&
        this.props.elevationData.length === 0
      ) {
        this.elevationPoints.push([event.lngLat.lng, event.lngLat.lat]);
        this.map.getSource("elevationPoints").setData({
          type: "FeatureCollection",
          features: this.elevationPoints.map((p) => {
            return {
              type: "Feature",
              geometry: {
                type: "Point",
                coordinates: p,
              },
            };
          }),
        });
        if (this.elevationPoints.length === 2) {
          this.props.runAction({
            type: "get-elevation",
            line: this.elevationPoints,
          });
          this.map.getSource("elevationLine").setData({
            type: "FeatureCollection",
            features: [
              {
                type: "Feature",
                geometry: {
                  type: "LineString",
                  coordinates: this.elevationPoints,
                },
              },
            ],
          });
        }
        return;
      }

      // If we are viewing fossils, prioritize clicks on those
      if (this.props.mapHasFossils) {
        let collections = this.map.queryRenderedFeatures(event.point, {
          layers: ["pbdb-points-clustered", "pbdb-points", "pbdb-clusters"],
        });
        // Clicked on a hex grid
        if (
          collections.length &&
          collections[0].properties.hasOwnProperty("hex_id")
        ) {
          this.map.zoomTo(this.map.getZoom() + 1, { center: event.lngLat });
          return;

          // Clicked on a summary cluster
        } else if (
          collections.length &&
          collections[0].properties.hasOwnProperty("oid") &&
          collections[0].properties.oid.split(":")[0] === "clu"
        ) {
          this.map.zoomTo(this.map.getZoom() + 2, { center: event.lngLat });
          return;
          // Clicked on a real cluster of collections
        } else if (
          collections.length &&
          collections[0].properties.hasOwnProperty("cluster")
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

      if (columns.length) {
        this.props.runAction({
          type: "map-query",
          lng: event.lngLat.lng,
          lat: event.lngLat.lat,
          z: this.map.getZoom(),
          column: columns[0],
        });
      } else {
        this.props.runAction({
          type: "map-query",
          lng: event.lngLat.lng,
          lat: event.lngLat.lat,
          z: this.map.getZoom(),
        });
      }

      let markerOffset = this.props.markerLoadOffset ?? [0, 0];

      /*
      Ok. I know this looks jank, and it is, but bear with me.
      When we pan the map to center the marker relative to the side panel
      a `movestart` event is fired on the map. That same `movestart` is the
      listener we use to listen for user input and remove the marker. By
      toggling this boolean we are able to ignore the `movestart` even when it
      is fired by this particular action.
      */
      //this.panning = true;
      this.map.panTo(event.lngLat, {
        offset: markerOffset,
        easing: (t) => t * (2 - t),
        duration: 500,
      });

      // Update the location of the marker
      this.map.getSource("info_marker").setData({
        type: "FeatureCollection",
        features: [
          {
            type: "Feature",
            geometry: {
              type: "Point",
              coordinates: [event.lngLat.lng, event.lngLat.lat],
            },
          },
        ],
      });

      const iconSize = this.props.mapHasSatellite ? 0.1 : 0.8;

      this.map.setLayoutProperty("infoMarker", "icon-size", iconSize);
      this.map.setLayoutProperty("infoMarker", "visibility", "visible");
    });

    // Fired after 'swapBasemap'
    this.map.on("style.load", () => {
      if (!this.currentSources.length) {
        return;
      }

      this.enable3DTerrain(this.props.use3D);

      this.currentSources.forEach((source) => {
        if (this.map.getSource(source.id) == null) {
          this.map.addSource(source.id, source.config);
        }
        if (source.data) {
          this.map.getSource(source.id).setData(source.data);
        }
      });

      // Readd all the previous layers to the map
      this.currentLayers.forEach((layer) => {
        if (layer.layer.id != "infoMarker") {
          this.map.addLayer(layer.layer, "airport-label");
        } else {
          this.map.addLayer(layer.layer);
        }

        if (layer.filters) {
          this.map.setFilter(layer.layer.id, layer.filters);
        }
      });
      setMapStyle(this, this.map, mapStyle, this.props);
    });
  }

  enable3DTerrain(shouldEnable: boolean) {
    if (!this.map.style._loaded) {
      return;
    }
    if (shouldEnable) {
      if (this.map.getSource("mapbox-dem") == null) {
        this.map.addSource("mapbox-dem", {
          type: "raster-dem",
          url: "mapbox://mapbox.mapbox-terrain-dem-v1",
          tileSize: 512,
          maxzoom: 14,
        });
      }

      // add a sky layer that will show when the map is highly pitched
      if (this.map.getLayer("sky") == null) {
        this.map.addLayer({
          id: "sky",
          type: "sky",
          paint: {
            "sky-type": "atmosphere",
            "sky-atmosphere-sun": [0.0, 0.0],
            "sky-atmosphere-sun-intensity": 15,
          },
        });
      }
    }
    // Enable or disable terrain depending on our current desires...
    const currentTerrain = this.map.getTerrain();
    if (shouldEnable && currentTerrain == null) {
      this.map.setTerrain({ source: "mapbox-dem", exaggeration: 1 });
    } else if (!shouldEnable && currentTerrain != null) {
      this.map.setTerrain(null);
    }
  }

  // Swap between standard and satellite base layers
  swapBasemap(toAdd) {
    this.currentSources = [];
    this.currentLayers = [];

    // First record which layers are currently on the map
    Object.keys(mapStyle.sources).forEach((source) => {
      let isPresent = this.map.getSource(source);
      if (isPresent) {
        this.currentSources.push({
          id: source,
          config: mapStyle.sources[source],
          data: isPresent._data || null,
        });
      }
    });

    mapStyle.layers.forEach((layer) => {
      let isPresent = this.map.getLayer(layer.id);
      if (isPresent) {
        this.currentLayers.push({
          layer: layer,
          filters: this.map.getFilter(layer.id),
        });
      }
    });

    this.enable3DTerrain(this.props.use3D);

    // Set the style. `style.load` will be fired after to readd other layers
    this.map.setStyle(toAdd);
  }

  // Handle updates to the state of the map
  // Since react isn't in charge of updating the map state we use shouldComponentUpdate
  // and always return `false` to prevent DOM updates
  // We basically intercept the changes, handle them, and tell React to ignore them
  shouldComponentUpdate(nextProps) {
    setMapStyle(this, this.map, mapStyle, nextProps);
    if (this.props.use3D !== nextProps.use3D) {
      return true;
    }

    if (nextProps.mapIsRotated !== this.props.mapIsRotated) {
      return true;
    }

    // Watch the state of the application and adjust the map accordingly
    if (
      !nextProps.elevationChartOpen &&
      this.props.elevationChartOpen &&
      this.map
    ) {
      this.elevationPoints = [];
      this.map.getSource("elevationPoints").setData({
        type: "FeatureCollection",
        features: [],
      });
      this.map.getSource("elevationLine").setData({
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
          console.log(nextProps.mapCenter, bounds);
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

      // Swap satellite/normal
    } else if (nextProps.mapHasSatellite != this.props.mapHasSatellite) {
      if (nextProps.mapHasSatellite) {
        this.swapBasemap.bind(this)(SETTINGS.satelliteMapURL);
      } else {
        this.swapBasemap.bind(this)(SETTINGS.baseMapURL);
      }
    }

    // Handle changes to map filters
    else if (
      JSON.stringify(nextProps.filters) !== JSON.stringify(this.props.filters)
    ) {
      // If all filters have been removed simply reset the filter states
      if (nextProps.filters.length === 0) {
        this.filters = [];
        this.filtersIndex = {};
        this.timeFilters = [];
        this.timeFiltersIndex = {};
        this.applyFilters();

        // Remove filtered columns and add unfiltered columns
        if (this.props.mapHasColumns) {
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

        if (nextProps.mapHasFossils === true) {
          this.refreshPBDB();
        }

        return false;
      }

      this.handleFilterChanges(nextProps);

      if (nextProps.mapHasFossils === true) {
        this.refreshPBDB();
      }

      // Basically if we are filtering by environments or anything else we can't filter the map with
      // if (!newFilter.length) {
      //   return
      // }

      // Update the map styles
      this.applyFilters();
      return false;
    }
    return false;
  }

  applyFilters() {
    // don't try and update featureState if the map is loading
    if (!this.mapLoaded) {
      this.shouldUpdateFeatureState = true;
      return;
    }
    const toApply = getToApply(this);
    this.map.setFilter("burwell_fill", toApply);
    this.map.setFilter("burwell_stroke", toApply);
  }

  // PBDB hexgrids and points are refreshed on every map move
  refreshPBDB() {
    let bounds = this.map.getBounds();
    console.log(bounds);
    let zoom = this.map.getZoom();
    PBDBHelper(this, bounds, zoom);
  }

  componentDidUpdate(prevProps, prevState) {
    this.enable3DTerrain(this.props.use3D);
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

  handleFilterChanges(nextProps) {
    getRemovedOrNewFilters(nextProps, this);
  }

  render() {
    const className = classNames({
      "is-rotated": this.props.mapIsRotated ?? false,
      "is-3d-available": this.props.use3D ?? false,
    });
    return h("div.mapbox-map#map", { ref: this.props.elementRef, className });
  }
}

export default forwardRef((props, ref) =>
  h(Map, { ...props, elementRef: ref })
);
