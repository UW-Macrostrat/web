import { createContext, useContext, RefObject } from "react";
import Map from "mapbox-gl";
import h from "@macrostrat/hyper";

const MapContext = createContext<RefObject<Map>>(null as any);

export function useMapRef() {
  return useContext(MapContext);
}

export function MapProvider({ children, mapRef }) {
  return h(MapContext.Provider, { value: mapRef }, children);
}
