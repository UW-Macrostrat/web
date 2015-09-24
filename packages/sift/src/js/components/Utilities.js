import _ from 'underscore';
import xhr from 'xhr';
import topojson from 'topojson';
import Explode from 'turf-explode';
import Convex from 'turf-convex';
import Wellknown from 'wellknown';
import Config from './Config';

var typeLookup = {
  'environ': 'environment',
  'lith': 'lithology',
  'econ': 'economic'
}

var Utilities = {
  wktHull(data) {
    return Wellknown.stringify(
      Convex(
        Explode(data)
      )
    );
  },

  fetchMapData(uri, callback) {
    xhr({
      uri: `${Config.apiURL}/${uri}&format=topojson_bare`
    }, (error, response, body) => {
      var data = JSON.parse(body);
      var geojson = topojson.feature(data, data.objects.output);

      // Assign a random identifier for this layer for more efficient component updating
      geojson._id = Math.random().toString(36).substring(7);
      callback(error, geojson);
    });
  },

  fetchData(uri, callback) {
    xhr({
      uri: `${Config.apiURL}/${uri}`
    }, (error, response, body) => {
      callback(error, JSON.parse(body));
    });
  },

  fetchPrevalentTaxa(coll_ids, callback) {
    xhr({
      uri: `${Config.pbdbURL}/occs/prevalence.json?limit=5&coll_id=${coll_ids}`
    }, (error, response, body) => {
      callback(error, JSON.parse(body));
    });
  },

  fetchPBDBCollections(space, callback) {
    // Get a convex hull of the desired extent as WKT
    var hull = this.wktHull(space);
    xhr({
      uri: `${Config.pbdbURL}/colls/list.json?loc='${hull}'`
    }, (error, response, body) => {
      var data = JSON.parse(body);
      callback(error, {
        "type": "FeatureCollection",
        "features": data.records.map(d => {
          return {
            "type": "Feature",
            "properties": {},
            "geometry": {
              "type": "Point",
              "coordinates": [
                d.lng,
                d.lat
              ]
            }
          };
        })
      });
    });
  },

  /* via http://stackoverflow.com/questions/2901102/how-to-print-a-number-with-commas-as-thousands-separators-in-javascript */
  addCommas(obj) {
    function commaize(x) {
      x = parseInt(x);
      var parts = x.toString().split(".");
      parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ",");
      return parts.join(".");
    }
    if (typeof(obj) === "object") {
      Object.keys(obj).forEach(function(j) {
        if (typeof(obj[j]) === "number" && j != "id" && j != "col_id" && j != "unit_id" && j != "strat_name_id") {
          obj[j] = commaize(obj[j])
        }
      });
      return obj;
    } else {
      return commaize(obj);
    }

  },

  parseAttributes(type, data) {
    var parsed = [];

    if (data.length > 5) {
      var types = {};
      data.forEach(d => {
        if (types[d.type]) {
          types[d.type].value += d.prop;
        } else {
          types[d.type || d.class] = {
            id: d[type + '_id'],
            type: typeLookup[type],
            value: d.prop,
            label: (type === 'environ') ? d.class + ': ' + (d.type || d.class) : d.type || d.class,
            color: Config[type + 'Colors'][d.type || d.class]
          }
        }
      });

      Object.keys(types).forEach(d => {
        parsed.push(types[d]);
      });
    } else {
      data.forEach(d => {
        parsed.push({
          id: d[type + '_id'],
          type: typeLookup[type],
          value: d.prop || 1/data.length,
          label: (type === 'environ') ? d.class + ': ' + d.name : d.name,
          color: Config[type + 'Colors'][d[type + '_id']]
        });
      });
    }

    return parsed;
  },

  summarize(data) {
    var summary = {
      col_area: 0,
      max_thick: 0,
      min_min_thick: 99999,
      b_age: 0,
      t_age: 99999,
      b_int_name: '',
      t_int_name: '',
      pbdb_collections: 0,
      t_units: 0,
      t_sections: 0
    }

    for (var i = 0; i < data.length; i++) {
      summary['col_area'] += data[i].properties.col_area;
      summary['pbdb_collections'] += data[i].properties.pbdb_collections;
      summary['t_units'] += data[i].properties.t_units;
      summary['t_sections'] += data[i].properties.t_sections;

      if (data[i].properties.max_thick > summary.max_thick) {
        summary.max_thick = data[i].properties.max_thick
      }
      if (data[i].properties.min_min_thick < summary.min_min_thick) {
        summary.min_min_thick = data[i].properties.min_min_thick;
      }
      if (data[i].properties.b_age > summary.b_age) {
        summary.b_age = data[i].properties.b_age;
        summary.b_int_name = data[i].properties.b_int_name;
      }
      if (data[i].properties.t_age < summary.t_age) {
        summary.t_age = data[i].properties.t_age;
        summary.t_int_name = data[i].properties.t_int_name;
      }
    }

    return summary;
  },

  summarizeAttributes(type, data) {
    var index = {};

    for (var i = 0; i < data.length; i++) {
      for (var j = 0; j < data[i].properties[type].length; j++) {
        // If we have seen this attribute ID before, add to the summary
        if (index[data[i].properties[type][j][type + '_id']]) {
          index[data[i].properties[type][j][type + '_id']].prop += data[i].properties[type][j].prop;
        } else {
          index[data[i].properties[type][j][type + '_id']] = data[i].properties[type][j];
        }
      }
    }

    var parsed = Object.keys(index).map(d => {
      index[d].prop = index[d].prop/data.length;
      return index[d];
    });

    return parsed;
  },

  /* via https://github.com/amussey/hex-to-rgb.js/blob/master/hex-to-rgb.js */
   hexToRgb(hex, alpha) {
      var result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
      var toString = function () {
          if (this.alpha == undefined) {
              return "rgb(" + this.r + ", " + this.g + ", " + this.b + ")";
          }
          if (this.alpha > 1) {
              this.alpha = 1;
          } else if (this.alpha < 0) {
              this.alpha = 0;
          }
          return "rgba(" + this.r + ", " + this.g + ", " + this.b + ", " + this.alpha + ")";
      }
      if (alpha == undefined) {
          return result ? {
              r: parseInt(result[1], 16),
              g: parseInt(result[2], 16),
              b: parseInt(result[3], 16),
              toString: toString
          } : null;
      }
      if (alpha > 1) {
          alpha = 1;
      } else if (alpha < 0) {
          alpha = 0;
      }
      return result ? {
          r: parseInt(result[1], 16),
          g: parseInt(result[2], 16),
          b: parseInt(result[3], 16),
          alpha: alpha,
          toString: toString
      } : null;
    }

}

export default Utilities;
