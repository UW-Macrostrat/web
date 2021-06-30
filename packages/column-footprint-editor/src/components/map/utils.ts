import * as topojson from "topojson-client";
import mapboxgl from "mapbox-gl";

function TopoJSONToLineString(json) {
  const multiLineString = topojson.mesh(json);

  const lines = multiLineString.coordinates;

  const features = lines.map((line) => {
    const lineString = {
      type: "Feature",
      properties: {},
      geometry: {
        type: "LineString",
        coordinates: line,
      },
    };

    return lineString;
  });

  const featureCollection = {
    type: "FeatureCollection",
    features: features,
  };
  console.log(featureCollection);
  return featureCollection;
}

/**
 * Would be better if I could do it based on pixel distance
 * Function tells whether too coordinates are the same or not
 * @param props
 * coord1:  [lng, lat]
 * coord2: [lng,lat]
 *
 *
 * @returns boolean
 */
function coordinatesAreEqual(props) {
  const { coord1, coord2 } = props;
  if (
    coord1[0].toFixed(1) == coord2[0].toFixed(1) &&
    coord1[1].toFixed(1) == coord2[1].toFixed(1)
  ) {
    return true;
  } else {
    return false;
  }
}

/**
 * Function to find distance between two points, using pixel distance
 * and basic geometry
 * @param props
 * @returns
 */
function distance_between_points(props) {
  const { point1, point2 } = props;
  let x1 = point1.x;
  let x2 = point2.x;

  let y1 = point1.y;
  let y2 = point2.y;

  let a = Math.pow(x2 - x1, 2);
  let b = Math.pow(y2 - y1, 2);

  return Math.sqrt(a + b);
}

function isOnOtherVertix(currentVertix, vertices) {
  let match = [];
  vertices.map((vertex) => {
    if (Array.isArray(vertex)) {
      if (coordinatesAreEqual({ coord1: currentVertix, coord2: vertex })) {
        match.push(1);
      }
    }
  });
  return match.length > 0;
}

//#8/-17.66/-149.66
function locationFromHash(hash) {
  if (hash == null) {
    ({ hash } = window.location);
  }
  const s = hash.slice(1);
  const v = s.split("/");
  if (v.length !== 3) {
    return { zoom: 2, latitude: 43, longitude: -89 };
  }
  const [zoom, latitude, longitude] = v.map((d) => parseFloat(d));

  return { zoom, latitude, longitude };
}

function setWindowHash({ zoom, latitude, longitude }) {
  const hashString = `${zoom}/${latitude}/${longitude}`;
  window.location.hash = hashString;
}

// useEffect(() => {
//   var map = new mapboxgl.Map({
//     container: mapContainerRef.current,
//     style: "mapbox://styles/mapbox/streets-v11", // style URL
//     center: [viewport.longitude, viewport.latitude], // starting position [lng, lat]
//     zoom: viewport.zoom, // starting zoom
//   });

//   const addToChangeSet = (obj) => {
//     setChangeSet((prevState) => {
//       return [...prevState, ...new Array(obj)];
//     });
//   };

//   var nav = new mapboxgl.NavigationControl();

//   map.addControl(nav);

//   map.addToChangeSet = addToChangeSet;

//   map.on("move", () => {
//     const [zoom, latitude, longitude] = [
//       map.getZoom().toFixed(2),
//       map.getCenter().lat.toFixed(4),
//       map.getCenter().lng.toFixed(4),
//     ];
//     setViewport({ longitude, latitude, zoom });
//     setWindowHash({ zoom, latitude, longitude });
//   });

//   if (!state.lines || !state.columns) return;
//   if (edit) {
//     /// draw.create, draw.delete, draw.update, draw.selectionchange
//     /// draw.modechange, draw.actionable, draw.combine, draw.uncombine
//     var Draw = new MapboxDraw({
//       controls: { point: false },
//       modes: Object.assign(
//         {
//           direct_select: MultVertDirectSelect,
//           simple_select: MultVertSimpleSelect,
//           draw_polygon: DrawPolygon,
//         },
//         MapboxDraw.modes,
//         { draw_line_string: SnapLineClosed }
//       ),
//       styles: SnapModeDrawStyles,
//       snap: true,
//       snapOptions: {
//         snapPx: 25,
//       },
//     });

//     map.addControl(Draw, "top-left");

//     var featureIds = Draw.add(state.lines);

//     map.on("click", function(e) {
//       console.log(Draw.getMode());
//     });

//     map.on("draw.create", function(e) {
//       console.log(e);
//       console.log("created new feature!");
//       const { type: action, features } = e;

//       features.map((feature) => {
//         const obj = { action, feature };
//         addToChangeSet(obj);
//       });
//     });

//     map.on("draw.delete", function(e) {
//       console.log(e);
//       const { type: action, features } = e;

//       features.map((feature) => {
//         const obj = { action, feature };
//         addToChangeSet(obj);
//       });
//     });

//     // use the splice to replace coords
//     // This needs to account for deleteing nodes. That falls under change_coordinates
//     map.on("draw.update", function(e) {
//       Draw.changeMode("simple_select", [e.features[0].id]);
//     });
//   } else {
//     map.on("load", function() {
//       map.addSource("columns", {
//         type: "geojson",
//         data: state.columns,
//       });
//       map.addLayer({
//         id: "column-fill",
//         type: "fill",
//         source: "columns", // reference the data source
//         paint: {
//           "fill-color": [
//             "case",
//             ["==", ["get", "col_id"], "nan"],
//             "#F95E5E",
//             "#0BDCB9",
//           ], // blue color fill
//           "fill-opacity": 0.5,
//         },
//       });
//       map.addLayer({
//         id: "outline",
//         type: "line",
//         source: "columns",
//         layout: {},
//         paint: {
//           "line-color": "#000",
//           "line-width": 1,
//         },
//       });
//     });
//     map.on("click", "column-fill", function(e) {
//       setFeatures(e.features);
//       setOpen(true);
//     });
//   }
//   return () => map.remove();
// }, [state.lines, edit, state.columns]);

export {
  TopoJSONToLineString,
  coordinatesAreEqual,
  isOnOtherVertix,
  distance_between_points,
  locationFromHash,
  setWindowHash,
};
