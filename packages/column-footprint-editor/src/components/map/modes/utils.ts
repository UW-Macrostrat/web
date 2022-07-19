import * as Constants from "@mapbox/mapbox-gl-draw/src/constants";
import nearestPointOnLine from "@turf/nearest-point-on-line";
import { distance_between_points } from "../utils";

function getClosestLine(lines, point, map) {
  lines = lines.filter((geom) => geom.geometry.type != "Point");
  if (lines.length == 0) {
    return { geometry: { coordinates: point } };
  }
  let closest;
  const pixelPoint = map.project(point);
  let minDis = null;
  lines.map((line) => {
    const newPoint = nearestPointOnLine(line, point);
    if (newPoint.properties.dist == Infinity) {
      return point;
    }
    const newPixelPoint = map.project(newPoint.geometry.coordinates);

    const dist = distance_between_points({
      point1: pixelPoint,
      point2: newPixelPoint,
    });

    if (!minDis && dist <= 40) {
      minDis = dist;
      closest = newPoint;
    } else if (dist < minDis && dist <= 40) {
      minDis = dist;
      closest = newPoint;
    }
  });
  if (closest) {
    return closest;
  } else {
    const point_ = { geometry: { coordinates: point } };
    return point_;
  }
}

function snapToCoord(state, e, map) {
  let lng = e.lngLat.lng;
  let lat = e.lngLat.lat;

  const closestPoint = getClosestLine(state.snapList, [lng, lat], map).geometry
    .coordinates;
  const [lng_, lat_] = closestPoint;

  return [lng_, lat_];
}

function parseMultiPath(path: string): number[] {
  let nums: number[] = path.split(".").map((str) => parseInt(str));
  return nums;
}

function incrementMultiPath(path: string, inc = true): string {
  let [line, path_] = parseMultiPath(path);
  if (inc) {
    path_++;
  } else {
    path_--;
  }
  return `${line}.${path_}`;
}

function pointBetweenPoints(bound1, bound2, point) {
  /// checks if the point is inbetween two points
  /// If the point is on the line made from the two points
  // it will return true
  const [x1, y1] = bound1;
  const [x2, y2] = bound2;
  const [xn, yn] = point;
  const xMax = Math.max.apply(Math, [x1, x2]);
  const xMin = Math.min.apply(Math, [x1, x2]);
  const yMax = Math.max.apply(Math, [y1, y2]);
  const yMin = Math.min.apply(Math, [y1, y2]);

  if (xn < xMax && xn > xMin && yn < yMax && yn > yMin) {
    return true;
  }
  return false;
}

const onChangeSetAdder = function (feature, this_) {
  const action = Constants.updateActions.CHANGE_COORDINATES;
  const obj = {
    action,
    feature: feature.toGeoJSON(),
  };
  this_.map.addToChangeSet(obj);
};

function createPointOnLine(ids, point, map) {
  const [lng, lat] = point;
  let lineIndex;
  let pointIndex;
  ids.map((id) => {
    const feature = map.getFeature(id);
    feature.features.map((f, lineIndex_) => {
      if (f) {
        const coordinates = f.coordinates;
        if (coordinates.length == 2) {
          // line segment
          f.addCoordinate(1, lng, lat);
          onChangeSetAdder(feature, map);
        }
        coordinates.map((coord, i) => {
          if (i <= coordinates.length - 2) {
            const bound1 = coordinates[i];
            const bound2 = coordinates[i + 1];
            if (pointBetweenPoints(bound1, bound2, point)) {
              pointIndex = i + 1;
              lineIndex = lineIndex_;
              const path = `${lineIndex}.${pointIndex}`;
              feature.addCoordinate(path, lng, lat);
              onChangeSetAdder(feature, map);
            }
          }
        });
      }
    });
  });
}

export { snapToCoord, parseMultiPath, incrementMultiPath, createPointOnLine };
