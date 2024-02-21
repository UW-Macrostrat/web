import {
  satelliteMapURL,
  baseMapURL,
  darkMapURL,
} from "@macrostrat-web/settings";

export function getBaseMapStyle(isSatellite = false, isDarkMode = false) {
  if (isSatellite) {
    return satelliteMapURL;
  }
  if (isDarkMode) {
    return darkMapURL;
  }
  return baseMapURL;
}
