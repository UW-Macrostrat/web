import React from 'react';
import L from 'leaflet';
import Utilities from './Utilities';

class IndexMap extends React.Component {
  constructor(props) {
    super(props);
  }

  componentDidMount() {
    if (this.map) {
      this.map.remove();
    }

    var map = this.map = L.map(document.getElementById('indexMap'), {
      minZoom: 1,
      maxZoom: 10,
      scrollWheelZoom: false,
      touchZoom: true,
    }).setView([40, -97], 3);


    L.tileLayer("https://{s}.tiles.mapbox.com/v3/jczaplewski.j751k57j/{z}/{x}/{y}.png", {
      attribution: "<a href='https://www.mapbox.com/about/maps/' target='_blank'>&copy; Mapbox &copy; OpenStreetMap</a>"
    }).addTo(map);

    Utilities.fetchMapData(`columns?all`, (error, geojson, refs) => {
      if (this.layer) {
        this.layer.clearLayers();
      }
      if (!(geojson.features.length)) {
        return;
      }
      
      this.props.updateRefs(Object.keys(refs).map(function(d) { return refs[d] }));

      this.layer = L.geoJson(geojson, {
        style: (feature) => {
          return {
            color: '#777777',
            fillOpacity: 0.4,
            opacity: 0.8,
            weight: 1,
            outline: 0
          }
        },
        onEachFeature: (feature,layer) => {
          layer.bindPopup(`
            <div class='pbdb-popup'>
              <a class='pbdb-popup-link'
                href='#/column/${feature.properties.col_id}'
              >
                ${feature.properties.col_name}
              </a>
              <br>
              <a class='index-map-group-link' href='#/group/${feature.properties.col_group_id}'>
                ${feature.properties.col_group} (${feature.properties.group_col_id})
              </a>
            </div>
          `)
        }
      }).addTo(this.map);
    });
  }

  render() {
    return (
      <div id='indexMap'></div>
    );
  }

}

export default IndexMap;
