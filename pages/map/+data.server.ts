import type { PageContextServer } from "vike/types";
import { getGeoIPResult } from "../../server/geoip";

export async function data(pageContext: PageContextServer) {
  const geo = getGeoIPResult(pageContext.clientIPAddress, true);
  let zoom = null;
  if (geo?.ll != null) {
    zoom = zoomLevelForRadius(geo.ll, 1000);
  }

  console.log(zoom);

  return {
    geo,
    zoom,
  };
}

function zoomLevelForRadius(center: [number, number], radius: number) {
  /** Get the approximate zoom level to show a circle with a given radius (in km) */
  const [lon, lat] = center;
  // scale radius by cos(lat) to account for longitude distortion
  const scale = Math.cos((lat * Math.PI) / 180);
  const radiusScaled = radius * scale;
  const zoom = Math.log2((40075016.686 * 0.5) / (256 * radiusScaled));
  return zoom;
}
