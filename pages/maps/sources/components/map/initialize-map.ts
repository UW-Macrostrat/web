import mapboxgl from "mapbox-gl";
import { mapboxAccessToken } from "@macrostrat-web/settings";

interface viewport {
  longitude: number;
  latitude: number;
  zoom;
}
interface MapProps {
  mapContainer: HTMLDivElement;
  viewport: viewport;
  setViewport: (viewport) => void;
  bounds?: number[];
  boxZoom?: boolean;
}
/* 
shared function to initialize a Mapbox Gl Js map in a useEffect 
*/
async function initializeMap(props: MapProps): Promise<mapboxgl.Map> {
  mapboxgl.accessToken = mapboxAccessToken;
  var map = new mapboxgl.Map({
    container: props.mapContainer,
    style: "mapbox://styles/mapbox/outdoors-v11", // style URL
    center: [props.viewport.longitude, props.viewport.latitude], // starting position [lng, lat]
    zoom: props.viewport.zoom, // starting zoom
    bounds: props.bounds || null,
    boxZoom: props.boxZoom || true,
  });
  map.on("move", () => {
    const [zoom, latitude, longitude] = [
      map.getZoom().toFixed(2),
      map.getCenter().lat.toFixed(4),
      map.getCenter().lng.toFixed(4),
    ];
    props.setViewport({ longitude, latitude, zoom });
  });

  return map;
}

export { initializeMap };
