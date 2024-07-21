import React from "react";
class IndexMap extends Component {
  constructor(props: IndexMapProps) {
    super(props);
    this.selectedFeatures = [];
    this.inactiveStyle = {
      color: "#333", //stroke color
      weight: 2, //stroke width
      fillColor: "#aaaaaa",
    };

    this.activeStyle = {
      color: "#FF5335", //stroke color
      weight: 3, //stroke width
    };
    this.highlightStyle = {
      color: "#FF5335",
      weight: 3,
      fillColor: "#FF5335",
    };
    this.currentScale = "";
  }

  renderMap(nextProps) {
    if (Object.keys(nextProps.activeFeature).length) {
      Object.keys(this.map._layers).forEach((layer) => {
        if (this.map._layers[layer]._layers) {
          Object.keys(this.map._layers[layer]._layers).forEach((obj) => {
            if (
              this.map._layers[layer]._layers[obj].feature.properties
                .source_id === nextProps.activeFeature.source_id
            ) {
              this.map._layers[layer]._layers[obj].setStyle(
                this.highlightStyle
              );
            } else {
              try {
                this.map._layers[layer]._layers[obj].setStyle(
                  this.inactiveStyle
                );
              } catch (e) {}
            }
          });
        }
      });
    }

    if (!nextProps.maps.length) {
      return;
    }
    if (
      (this.map && nextProps.selectedScale != this.currentScale) ||
      !this.currentScale.length
    ) {
      this.currentScale = nextProps.selectedScale;
      this.features.clearLayers();
      this.features.addData({
        type: "FeatureCollection",
        features: nextProps.maps,
      });
    }
  }

  componentDidMount() {
    var map = (this.map = L.map("index-map", {
      minZoom: 0,
      maxZoom: 14,
    }).setView([40.8, -94.1], 3));

    this.map.on("click", (event) => {
      //  this.features.setStyle(this.inactiveStyle)
      let bounds = L.latLngBounds(event.latlng, event.latlng);
      let intersecting = [];

      Object.keys(this.map._layers).forEach((layer) => {
        if (this.map._layers[layer]._layers) {
          Object.keys(this.map._layers[layer]._layers).forEach((obj) => {
            if (
              bounds.intersects(this.map._layers[layer]._layers[obj]._bounds)
            ) {
              this.map._layers[layer]._layers[obj].setStyle(this.activeStyle);
              this.map._layers[layer]._layers[obj].bringToFront();
              intersecting.push(this.map._layers[layer]._layers[obj]);
            } else {
              this.map._layers[layer]._layers[obj].setStyle(this.inactiveStyle);
            }
          });
        }
      });

      let uniques = {};
      intersecting = intersecting
        .map((feature) => {
          feature.feature.properties.geometry = feature.feature.geometry;
          return feature.feature.properties;
        })
        .filter((feature) => {
          if (!uniques[feature.source_id]) {
            uniques[feature.source_id] = true;
            return feature;
          }
        });

      this.props.onSelectFeatures(intersecting || []);
      this.selectedFeatures = intersecting;

      if (intersecting.length) {
        this.props.openMenu();
      }
    });

    L.tileLayer(
      "https://api.mapbox.com/styles/v1/{id}/tiles/{z}/{x}/{y}?access_token={accessToken}",
      {
        attribution:
          '© <a href="https://www.mapbox.com/about/maps/">Mapbox</a> © <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a> <strong><a href="https://www.mapbox.com/map-feedback/" target="_blank">Improve this map</a></strong>',
        tileSize: 512,
        maxZoom: 18,
        zoomOffset: -1,
        id: "mapbox/outdoors-v11",
        accessToken:
          "pk.eyJ1IjoiamN6YXBsZXdza2kiLCJhIjoiY2tpcjQ1cG1yMGZvcTJ6b3psbXB6bmtweiJ9.TkabsM8gNsZ7bHGJXu6vOQ",
      }
    ).addTo(map);

    var features = (this.features = L.geoJson(
      {
        type: "FeatureCollection",
        features: this.props.maps,
      },
      {
        style: {
          color: "#333", //stroke color
          weight: 2, //stroke width
          fillColor: "#aaaaaa",
        },
      }
    ).addTo(map));
  }

  componentWillReceiveProps(nextProps) {
    this.renderMap(nextProps);
  }

  render() {
    return (
      <div className="index-map-container">
        <div id="index-map"></div>
      </div>
    );
  }
}
