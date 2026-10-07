import { useMapInitialized, useMapRef } from "@macrostrat/mapbox-react";
import { useEffect } from "react";

/** Resizes the map with its container at most once a frame. `MapView`'s own
 * observer is debounced, which stretches the canvas through a drag. */
export function MapResizer() {
  const mapRef = useMapRef();
  const initialized = useMapInitialized();

  useEffect(() => {
    const map = mapRef.current;
    if (map == null || !initialized) return;
    let frame: number | null = null;
    const observer = new ResizeObserver(() => {
      if (frame != null) return;
      frame = requestAnimationFrame(() => {
        frame = null;
        map.resize();
      });
    });
    observer.observe(map.getContainer());
    return () => {
      observer.disconnect();
      if (frame != null) cancelAnimationFrame(frame);
    };
  }, [initialized]);

  return null;
}
