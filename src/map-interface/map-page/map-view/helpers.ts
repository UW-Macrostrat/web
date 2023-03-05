import { useMapRef } from "@macrostrat/mapbox-react";
import { useRef } from "react";
import { debounce } from "underscore";
import useResizeObserver from "use-resize-observer";

export function MapResizeManager({ containerRef }) {
  const mapRef = useMapRef();

  const debouncedResize = useRef(
    debounce(() => {
      mapRef.current?.resize();
    }, 100)
  );

  useResizeObserver({
    ref: containerRef,
    onResize: debouncedResize.current,
  });

  return null;
}
