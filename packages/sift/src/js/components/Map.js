import React from 'react';
import L from 'leaflet';
import xhr from 'xhr';
import Centroid from 'turf-centroid';
import topojson from 'topojson';
import Utilities from './Utilities';


/* Via https://gist.github.com/missinglink/7620340 */
L.Map.prototype.panToOffset = function (latlng, offset, options) {
  var x = this.latLngToContainerPoint(latlng).x - offset[0],
      y = this.latLngToContainerPoint(latlng).y - offset[1],
      point = this.containerPointToLatLng([x, y]),
      opts = (options) ? options : {'animate': true, 'duration': 0.6, 'noMoveStart': true};

  return this.setView(point, this._zoom, { pan: opts });
};

class Map extends React.Component {
  constructor(props) {
    super(props);
    this.addLayer = this.addLayer.bind(this);
    this.state = {
      data: {features: [], _id: -1},
      fossils: {features: [], _id: -1},
      target: '',
      outcrop: {features: [], _id: -1},
      showOutcrop: false
    }
  }

  componentDidMount() {
    if (this.map) {
      this.map.remove();
    }
    var map = this.map = L.map(document.getElementById('map'), {
      minZoom: 1,
      maxZoom: 10,
      zoomControl: false,
      scrollWheelZoom: false,
    //  keyboard: false,
    //  dragging: false,
      touchZoom: true,
    //  doubleClickZoom: false,
    //  boxZoom: false
    }).setView([40, -97], 6);

    var control = L.control.zoom({
      position: 'topright'
    }).addTo(map);

    this.tiles = L.tileLayer("https://{s}.tiles.mapbox.com/v3/jczaplewski.j751k57j/{z}/{x}/{y}.png", {
      attribution: "<a href='https://www.mapbox.com/about/maps/' target='_blank'>&copy; Mapbox &copy; OpenStreetMap</a>"
    }).addTo(map);

    this.darkTiles = L.tileLayer("https://cartodb-basemaps-{s}.global.ssl.fastly.net/dark_all/{z}/{x}/{y}.png", {
      attribution: '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors, &copy; <a href="http://cartodb.com/attributions">CartoDB</a>'
    });

    this.satellite = L.tileLayer('https://{s}.tiles.mapbox.com/v3/jczaplewski.ld2ndl61/{z}/{x}/{y}.png', {
      zIndex: 10,
      attribution: "<a href='https://www.mapbox.com/about/maps/' target='_blank'>&copy; Mapbox &copy; OpenStreetMap</a>"
    });

    this.outcropLayer = L.geoJson(null, {
      style: (feature) => {
        return {
          color: feature.properties.color,
          fillOpacity: 0.8,
          opacity: 0.8,
          weight: 1,
          outline: 0
        }
      }
    });

    this.outcropLayer.on('click', (event) => {
      Utilities.fetchData(`/geologic_units/burwell?scale=medium&lat=${event.latlng.lat}&lng=${event.latlng.lng}`, (error, data) => {
        if (data.success && data.success.data.length) {
          var burwellData = data.success.data[0];
          L.popup()
            .setLatLng(event.latlng)
            .setContent(`
              <div class='burwell-popup'>
                <h4>${burwellData.strat_name} (${burwellData.map_id})</h4>
                <table class="table table-stripped">
                  <tbody>
                    <tr>
                      <td class='burwell-popup-head'>Age</td>
                      <td>${burwellData.b_int_name} - ${burwellData.t_int_name}</td>
                    </tr>
                    <tr>
                      <td class='burwell-popup-head'>Age (MA)</td>
                      <td>${burwellData.b_int_age} - ${burwellData.t_int_age}</td>
                    </tr>
                    <tr>
                      <td class='burwell-popup-head'>Description</td>
                      <td>${burwellData.descrip}</td>
                    </tr>
                    <tr>
                      <td class='burwell-popup-head'>Comments</td>
                      <td>${burwellData.comments}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            `)
            .openOn(this.map);
        }
      });
    });

    this.fossilLayer = L.geoJson(null, {
      pointToLayer: (feature, latlng) => {
        return L.circleMarker(latlng, this.props.defaultFossilStyle)
      },
      onEachFeature: (feature, layer) => {
        layer.bindPopup(`
          <div class='pbdb-popup'>
            <a class='pbdb-popup-link'
              href='https://paleobiodb.org/cgi-bin/bridge.pl?a=basicCollectionSearch&collection_no=${feature.properties.cltn_id}'
              target='_blank'>
              ${feature.properties.cltn_name}
            </a>
            <br>
            ${feature.properties.pbdb_occs} occurrences
          </div>
          `)
      }
    }).addTo(map);
  }

  toggleSatellite() {
    if (this.map.hasLayer(this.satellite)) {
      this.map.removeLayer(this.satellite);
    } else {
      this.map.addLayer(this.satellite);
    }
  }

  toggleOutcrop() {
    // If we are in column view
    if (this.map.hasLayer(this.tiles)) {
      this.map.removeLayer(this.tiles);
      this.map.addLayer(this.darkTiles);
      this.map.removeLayer(this.layer);
      this.map.addLayer(this.outcropLayer);
      // WTF...why is a timeout necessary for this to work?
      setTimeout(() => {
        this.fossilLayer.bringToFront();
      }, 10);
    }
    // Otherwise if we are in outcrop view
    else {
      this.map.removeLayer(this.darkTiles);
      this.map.addLayer(this.tiles);
      this.map.removeLayer(this.outcropLayer);
      this.map.addLayer(this.layer);
      this.fossilLayer.bringToFront();
    }
  }

  toggleFossils() {
    if (!this.props.showFossils) {
      this.fossilLayer.setStyle((feature, layer) => {
        return this.props.highlightedFossilStyle
      });
    } else {
      this.fossilLayer.setStyle((feature, layer) => {
        return this.props.defaultFossilStyle
      });
    }

    this.fossilLayer.bringToFront();

  }

  addOutcropLayer(geojson) {
    if (this.outcropLayer) {
      this.outcropLayer.clearLayers();
    }

    if (!(geojson.features.length)) {
      return;
    }

    this.outcropLayer.addData(geojson);

  }

  addLayer(geojson, target, props) {
    if (this.layer) {
      this.layer.clearLayers();
    //  this.map.removeLayer(this.layer);
    }
    if (!(geojson.features.length)) {
      return;
    }
    var target = (target) ? geojson.features[0].properties.col_id : '';

    this.layer = L.geoJson(geojson, {
      style: (feature) => {
        if (feature.properties.col_id === target) {
          return {
            color: '#990000',
            fillOpacity: 0.6,
            opacity: 0.8,
            weight: 1,
            outline: 0
          }
        } else {
          return {
            color: '#777777',
            fillOpacity: 0.4,
            opacity: 0.8,
            weight: 1,
            outline: 0
          }
        }
      },
      onEachFeature: (feature,layer) => {
        layer.on('click', function(d) {
          window.location.hash = '#/column/' + d.target.feature.properties.col_id;
        });
      }
    });

    this.layer.setZIndex(1);
    // Add columns if we are not showing outcrops and not showing columns
    if (!(this.map.hasLayer(this.layer)) && (props.showOutcrop == false)) {
      this.map.addLayer(this.layer);
      this.layer.bringToBack();
    }

    if (target) {
      var center = Centroid(geojson.features[0]).geometry.coordinates;
      setTimeout(() => {
        this.map.panToOffset([center[1], center[0]], [100, 0]);
      }, 1)

    } else {
      // No f'ing clue why I need a timeout to make this work...
      setTimeout(() => {
        this.map.fitBounds(this.layer.getBounds(), {
          animate: false
        });
      }, 1)
    }

    this.map.invalidateSize();

  }

  addFossils(geojson) {
    if (this.fossilLayer) {
      this.fossilLayer.clearLayers();
    }

    if (!(geojson.features.length)) {
      return;
    }

    this.fossilLayer.addData(geojson);
  }

  componentWillReceiveProps(nextProps) {
    console.log("update map", nextProps.data._id, this.props.data._id)
    if (nextProps.hasOwnProperty('showOutcrop') && nextProps.showOutcrop != this.props.showOutcrop) {
      this.toggleOutcrop();
    }
    if (nextProps.hasOwnProperty('showFossils') && nextProps.showFossils != this.props.showFossils) {
      this.toggleFossils();
    }
    if (nextProps.hasOwnProperty('showSatellite') && nextProps.showSatellite != this.props.showSatellite) {
      this.toggleSatellite();
    }
    if (nextProps.hasOwnProperty('outcrop') && nextProps.outcrop._id != this.props.outcrop._id) {
      this.addOutcropLayer(nextProps.outcrop);
    }
    if (nextProps.hasOwnProperty('fossils') && nextProps.fossils._id != this.props.fossils._id) {
      this.addFossils(nextProps.fossils);
    }
    if (nextProps.data._id != this.props.data._id) {
      this.addLayer(nextProps.data, nextProps.target, nextProps);
    }

  }

  render() {
    return (
      <div id='map'></div>
    );
  }

}

Map.defaultProps = {
  showOutcrop: false,
  defaultFossilStyle: {
    color: '#ffffff',
    fillColor: '#ffffff',
    fillOpacity: 0.8,
    opacity: 0.8,
    weight: 1,
    outline: 0,
    radius: 1
  },
  highlightedFossilStyle: {
    color: '#ffffff',
    fillColor: '#000000',
    fillOpacity: 0.8,
    opacity: 0.8,
    weight: 1,
    outline: 1.5,
    radius: 7
  }
}

export default Map;
