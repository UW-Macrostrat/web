import React from "react";
import { siftPrefix } from "./Link";
import Utilities from "./Utilities";

class IndexMap extends React.Component {
  constructor(props) {
    super(props);
  }

  componentDidMount() {
    if (this.map) {
      this.map.remove();
    }

    var map = (this.map = L.map(document.getElementById("indexMap"), {
      minZoom: 2,
      maxZoom: 10,
      scrollWheelZoom: false,
      touchZoom: true,
      worldCopyJump: true,
    }).setView([28, 0], 2));

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

    Utilities.fetchMapData(`columns?all`, (error, geojson, refs) => {
      if (this.layer) {
        this.layer.clearLayers();
      }
      if (!geojson.features.length) {
        return;
      }

      this.props.updateRefs(
        Object.keys(refs).map(function (d) {
          return refs[d];
        })
      );

      this.layer = L.geoJson(geojson, {
        style: (feature) => {
          return {
            color: "#777777",
            fillOpacity: 0.4,
            opacity: 0.8,
            weight: 1,
            outline: 0,
          };
        },
        onEachFeature: (feature, layer) => {
          layer.bindPopup(`
            <div class='pbdb-popup'>
              <a class='pbdb-popup-link'
                href='${siftPrefix}/column/${feature.properties.col_id}'
              >
                ${feature.properties.col_name}
              </a>
              <br>
              <a class='index-map-group-link' href='${siftPrefix}/group/${feature.properties.col_group_id}'>
                ${feature.properties.col_group} (${feature.properties.group_col_id})
              </a>
            </div>
          `);
        },
      }).addTo(this.map);
    });
  }

  render() {
    return (
      <div id="indexMap" className="mapbox-map">
        <a
          href="http://mapbox.com/about/maps"
          className="mapbox-logo"
          target="_blank"
        >
          Mapbox
        </a>
      </div>
    );
  }
}

export default IndexMap;
