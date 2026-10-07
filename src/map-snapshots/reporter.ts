/** The snapshot route's side of the renderer contract.
 *
 * Mounted inside a `MapView`, this waits for the map to settle and then
 * publishes a handle on `window.__macrostratMapSnapshot`, which the renderer
 * polls and captures through. Settled means Mapbox's `idle` — style, sources
 * and terrain loaded, nothing animating — held for `settleMs` without another
 * frame: style operators (a filter's `setPaintProperty`, a GeoJSON source
 * being filled) run *after* the first `idle` and trigger a second one.
 *
 * The capture reads the WebGL canvas, so the map must be built with
 * `preserveDrawingBuffer: true`. It is the canvas only: HTML over the map —
 * controls, the Mapbox wordmark, attribution — is not in the image, and the
 * page that shows it draws those itself.
 *
 * Works for any `mapbox-gl` (or `maplibre-gl`) map; it only needs `on`/`off`,
 * `loaded`, `areTilesLoaded` and `getCanvas`. The same idle-then-read loop is
 * what `renderTiledMap` in `@macrostrat/static-map-utils` does per tile, and
 * this is the piece to lift into that package once a second site needs it.
 */
import { useEffect } from "react";
import { useMapInitialized, useMapRef } from "@macrostrat/mapbox-react";

export type MapSnapshotStatus = "loading" | "ready" | "timeout";

export interface MapSnapshotHandle {
  key: string;
  status: MapSnapshotStatus;
  /** Canvas size in device pixels. */
  width: number;
  height: number;
  capture(mimeType: string, quality?: number): string;
}

declare global {
  interface Window {
    __macrostratMapSnapshot?: MapSnapshotHandle;
  }
}

interface ReporterOptions {
  /** The key the server computed for this view. The renderer files the image
   * under it, so the deployed site's idea of the key is the one that counts. */
  snapshotKey: string;
  settleMs?: number;
  timeoutMs?: number;
}

export function MapSnapshotReporter(props: ReporterOptions) {
  useMapSnapshotReporter(props);
  return null;
}

export function useMapSnapshotReporter({
  snapshotKey,
  settleMs = 750,
  timeoutMs = 90_000,
}: ReporterOptions) {
  const mapRef = useMapRef();
  const initialized = useMapInitialized();

  useEffect(() => {
    const map = mapRef.current;
    if (map == null) return;

    const publish = (status: MapSnapshotStatus) => {
      const canvas = map.getCanvas();
      window.__macrostratMapSnapshot = {
        key: snapshotKey,
        status,
        width: canvas.width,
        height: canvas.height,
        capture: (mimeType, quality) => canvas.toDataURL(mimeType, quality),
      };
      document.documentElement.dataset.mapSnapshot = status;
    };

    publish("loading");

    let settleTimer: ReturnType<typeof setTimeout> | null = null;
    const cancelSettle = () => {
      if (settleTimer != null) clearTimeout(settleTimer);
      settleTimer = null;
    };
    const onIdle = () => {
      cancelSettle();
      settleTimer = setTimeout(() => {
        if (!map.loaded() || !map.areTilesLoaded()) return;
        publish("ready");
      }, settleMs);
    };

    const deadline = setTimeout(() => {
      if (window.__macrostratMapSnapshot?.status !== "ready") {
        publish("timeout");
      }
    }, timeoutMs);

    map.on("idle", onIdle);
    map.on("render", cancelSettle);
    // In case the map went idle before this mounted: one more frame, and the
    // `idle` after it.
    map.triggerRepaint();
    return () => {
      cancelSettle();
      clearTimeout(deadline);
      map.off("idle", onIdle);
      map.off("render", cancelSettle);
    };
  }, [initialized, snapshotKey, settleMs, timeoutMs]);
}
