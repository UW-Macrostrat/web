import { createContext, useContext, RefObject, useRef } from "react";
import Map from "mapbox-gl";
import h from "@macrostrat/hyper";
import { MapPosition } from "~/map-interface/app-state";

const MapContext = createContext<RefObject<Map>>(null as any);

export function useMapRef() {
  return useContext(MapContext);
}

export function MapboxMapProvider({ children }) {
  const mapRef = useRef<Map>();
  return h(MapContext.Provider, { value: mapRef }, children);
}

interface MapViewInfo {
  mapIsRotated: boolean;
  mapUse3D: boolean;
  mapIsGlobal: boolean;
}

export function viewInfo(mapPosition: MapPosition): MapViewInfo {
  // Switch to 3D mode at high zoom levels or with a rotated map
  const pitch = mapPosition.camera.pitch ?? 0;
  const bearing = mapPosition.camera.bearing ?? 0;
  const alt = mapPosition.camera.altitude;
  const mapIsRotated = pitch != 0 || bearing != 0;

  const mapIsGlobal = mapPosition.camera.altitude > 500000;

  let mapUse3D = false;
  if (alt != null) {
    mapUse3D = (pitch > 0 && alt < 200000) || alt < 80000;
  }

  return {
    mapIsRotated,
    mapUse3D,
    mapIsGlobal,
  };
}
