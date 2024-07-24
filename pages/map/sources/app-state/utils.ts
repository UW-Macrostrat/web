export const addCommas = (x) => {
  x = parseInt(x);
  var parts = x.toString().split(".");
  parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  return parts.join(".");
};

export const getVisibleScale = (maps, filter) => {
  switch (filter) {
    case "all":
      return maps;
    case "large":
      return maps.filter((d) => {
        if (d.properties.scale === "large") return d;
      });
    case "medium":
      return maps.filter((d) => {
        if (d.properties.scale === "medium") return d;
      });
    case "small":
      return maps.filter((d) => {
        if (d.properties.scale === "small") return d;
      });
    case "tiny":
      return maps.filter((d) => {
        if (d.properties.scale === "tiny") return d;
      });
    default:
      return [];
  }
};

export function getCenter(coordinates) {
  const lat = (coordinates[0][0][1] + coordinates[0][2][1]) / 2;
  const long = (coordinates[0][0][0] + coordinates[0][2][0]) / 2;
  return [long, lat];
}

export const zoomMap = {
  tiny: 1,
  small: 3,
  medium: 4,
  large: 7,
};

export const offsetMap = {
  tiny: 10,
  small: 10,
  medium: 4,
  large: 0.05,
};

export function flyToData(feature) {
  const [long, lat] = getCenter(feature.geometry.coordinates);
  const zoom = zoomMap[feature.properties.scale];
  let offset = offsetMap[feature.properties.scale];

  return { center: [long + offset, lat], zoom };
}
